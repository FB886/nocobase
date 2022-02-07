import {
  Model,
  BelongsToGetAssociationMixin,
  Optional,
  HasManyGetAssociationsMixin,
  Transaction
} from 'sequelize';

import Database from '@nocobase/database';

import { EXECUTION_STATUS, JOB_STATUS } from '../constants';
import { getInstruction } from '../instructions';
import WorkflowModel from './Workflow';
import FlowNodeModel from './FlowNode';
import JobModel from './Job';

interface ExecutionAttributes {
  id: number;
  title: string;
  context: any;
  status: number;
}

interface ExecutionCreationAttributes extends Optional<ExecutionAttributes, 'id'> {}

export interface ExecutionOptions {
  transaction?: Transaction;
}

export default class ExecutionModel
  extends Model<ExecutionAttributes, ExecutionCreationAttributes>
  implements ExecutionAttributes {

  declare static readonly database: Database;

  declare id: number;
  declare title: string;
  declare context: any;
  declare status: number;

  declare createdAt: Date;
  declare updatedAt: Date;

  declare workflow?: WorkflowModel;
  declare getWorkflow: BelongsToGetAssociationMixin<WorkflowModel>;

  declare jobs?: JobModel[];
  declare getJobs: HasManyGetAssociationsMixin<JobModel>;

  options: ExecutionOptions;
  transaction: Transaction;

  nodes: Array<FlowNodeModel> = [];
  nodesMap = new Map<number, FlowNodeModel>();
  jobsMap = new Map<number, JobModel>();

  static StatusMap = {
    [JOB_STATUS.PENDING]: EXECUTION_STATUS.STARTED,
    [JOB_STATUS.RESOLVED]: EXECUTION_STATUS.RESOLVED,
    [JOB_STATUS.REJECTED]: EXECUTION_STATUS.REJECTED,
    [JOB_STATUS.CANCELLED]: EXECUTION_STATUS.CANCELLED,
  };

  // make dual linked nodes list then cache
  makeNodes(nodes = []) {
    this.nodes = nodes;

    nodes.forEach(node => {
      this.nodesMap.set(node.id, node);
    });

    nodes.forEach(node => {
      if (node.upstreamId) {
        node.upstream = this.nodesMap.get(node.upstreamId);
      }

      if (node.downstreamId) {
        node.downstream = this.nodesMap.get(node.downstreamId);
      }
    });
  }

  makeJobs(jobs: Array<JobModel>) {
    jobs.forEach(job => {
      this.jobsMap.set(job.id, job);
    });
  }

  async prepare(options) {
    if (this.status !== EXECUTION_STATUS.STARTED) {
      throw new Error(`execution was ended with status ${this.status}`);
    }

    this.options = options || {};
    const { transaction = await (<typeof ExecutionModel>this.constructor).database.sequelize.transaction() } = this.options;
    this.transaction = transaction;

    if (!this.workflow) {
      this.workflow = await this.getWorkflow({ transaction });
    }

    const nodes = await this.workflow.getNodes({ transaction });

    this.makeNodes(nodes);

    const jobs = await this.getJobs({ transaction });

    this.makeJobs(jobs);
  }

  async start(options: ExecutionOptions) {
    await this.prepare(options);
    if (this.nodes.length) {
      const head = this.nodes.find(item => !item.upstream);
      await this.exec(head, { result: this.context });
    } else {
      await this.exit(null);
    }
    await this.commit();
  }

  async resume(job: JobModel, options: ExecutionOptions) {
    await this.prepare(options);
    const node = this.nodesMap.get(job.nodeId);
    await this.recall(node, job);
    await this.commit();
  }

  private async commit() {
    if (!this.options || !this.options.transaction) {
      await this.transaction.commit();
    }
  }

  private async run(instruction, node: FlowNodeModel, prevJob) {
    let job;
    try {
      // call instruction to get result and status
      job = await instruction.call(node, prevJob, this);
      if (!job) {
        return null;
      }
    } catch (err) {
      // for uncaught error, set to rejected
      job = {
        result: err instanceof Error ? err.toString() : err,
        status: JOB_STATUS.REJECTED
      };
      // if previous job is from resuming
      if (prevJob && prevJob.nodeId === node.id) {
        prevJob.set(job);
        job = prevJob;
      }
    }

    let savedJob: JobModel;
    // TODO(optimize): many checking of resuming or new could be improved
    // could be implemented separately in exec() / resume()
    if (job instanceof Model) {
      savedJob = await job.save({ transaction: this.transaction }) as JobModel;
    } else {
      const upstreamId = prevJob instanceof Model ? prevJob.get('id') : null;
      savedJob = await this.saveJob({
        nodeId: node.id,
        upstreamId,
        ...job
      });
    }

    if (savedJob.get('status') === JOB_STATUS.RESOLVED && node.downstream) {
      // run next node
      return this.exec(node.downstream, savedJob);
    }

    // all nodes in scope have been executed
    return this.end(node, savedJob);
  }

  async exec(node, input?) {
    const { run } = getInstruction(node.type);

    return this.run(run, node, input);
  }

  // parent node should take over the control
  end(node, job) {
    const parentNode = this.findBranchParentNode(node);
    // no parent, means on main flow
    if (parentNode) {
      return this.recall(parentNode, job);
    }
    
    // really done for all nodes
    // * should mark execution as done with last job status
    return this.exit(job);
  }

  async recall(node, job) {
    const { resume } = getInstruction(node.type);
    if (!resume) {
      return Promise.reject(new Error('`resume` should be implemented because the node made branch'));
    }

    return this.run(resume, node, job);
  }

  async exit(job: JobModel | null) {
    const status = job ? ExecutionModel.StatusMap[job.status] : EXECUTION_STATUS.RESOLVED;
    await this.update({ status }, { transaction: this.transaction });
    return null;
  }

  // TODO(optimize)
  async saveJob(payload) {
    const { database } = <typeof WorkflowModel>this.constructor;
    const { model } = database.getCollection('jobs');
    const [result] = await model.upsert({
      ...payload,
      executionId: this.id
    }, { transaction: this.transaction }) as [JobModel, boolean | null];
    this.jobsMap.set(result.id, result);

    return result;
  }

  // find the first node in current branch
  findBranchStartNode(node: FlowNodeModel): FlowNodeModel | null {
    for (let n = node; n; n = n.upstream) {
      if (n.branchIndex !== null) {
        return n;
      }
    }
    return null;
  }

  // find the node start current branch
  findBranchParentNode(node: FlowNodeModel): FlowNodeModel | null {
    for (let n = node; n; n = n.upstream) {
      if (n.branchIndex !== null) {
        return n.upstream;
      }
    }
    return null;
  }

  findBranchParentJob(job: JobModel, node: FlowNodeModel): JobModel | null {
    for (let j = job; j; j = this.jobsMap.get(j.upstreamId)) {
      if (j.nodeId === node.id) {
        return j;
      }
    }
    return null;
  }
}