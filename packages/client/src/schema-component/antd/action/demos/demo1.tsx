import React from 'react';
import { observer, ISchema, useForm } from '@formily/react';
import { SchemaComponent, SchemaComponentProvider, Form, Action, useActionVisible } from '@nocobase/client';
import { FormItem, Input } from '@formily/antd';
import 'antd/dist/antd.css';

const useCloseAction = () => {
  const { setVisible } = useActionVisible();
  const form = useForm();
  return {
    async run() {
      setVisible(false);
      form.submit((values) => {
        console.log(values);
      });
    },
  };
};

const schema: ISchema = {
  type: 'object',
  properties: {
    action1: {
      'x-component': 'Action',
      'x-component-props': {
        type: 'primary',
      },
      type: 'void',
      title: 'Open',
      properties: {
        drawer1: {
          'x-component': 'Action.Drawer',
          type: 'void',
          title: 'Drawer Title',
          properties: {
            hello1: {
              'x-content': 'Hello',
              title: 'T1',
            },
            footer1: {
              'x-component': 'Action.Drawer.Footer',
              type: 'void',
              properties: {
                close1: {
                  title: 'Close',
                  'x-component': 'Action',
                  'x-component-props': {
                    useAction: '{{ useCloseAction }}',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default observer(() => {
  return (
    <SchemaComponentProvider scope={{ useCloseAction }} components={{ Form, Action, Input, FormItem }}>
      <SchemaComponent schema={schema} />
    </SchemaComponentProvider>
  );
});