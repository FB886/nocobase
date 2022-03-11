import { FormOutlined } from '@ant-design/icons';
import { ISchema } from '@formily/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SchemaInitializer } from '../..';
import { useCollection } from '../../../collection-manager';

const createSchema = (collectionName) => {
  const schema: ISchema = {
    type: 'void',
    'x-decorator': 'ResourceActionProvider',
    'x-decorator-props': {
      collection: collectionName,
      request: {
        resource: collectionName,
        action: 'get',
        params: {},
      },
    },
    'x-designer': 'Form.Designer',
    'x-component': 'CardItem',
    properties: {
      form: {
        type: 'void',
        'x-decorator': 'Form',
        'x-decorator-props': {
          useValues: '{{ cm.useValuesFromRA }}',
        },
        properties: {
          grid: {
            type: 'void',
            'x-component': 'Grid',
            'x-initializer': 'GridFormItemInitializers',
            properties: {},
          },
          actions: {
            type: 'void',
            'x-initializer': 'RecordFormActionInitializers',
            'x-component': 'ActionBar',
            'x-component-props': {
              layout: 'one-column',
              style: {
                marginTop: 24,
              },
            },
            properties: {
              submit: {
                title: '{{ t("Submit") }}',
                'x-action': 'submit',
                'x-component': 'Action',
                'x-component-props': {
                  type: 'primary',
                  useAction: '{{ cm.useUpdateViewAction }}',
                },
              },
            },
          },
        },
      },
    },
  };
  return schema;
};

export const RecordFormBlockInitializer = (props) => {
  const { insert } = props;
  const { name } = useCollection();
  const { t } = useTranslation();
  return (
    <SchemaInitializer.Item
      {...props}
      icon={<FormOutlined />}
      onClick={({ item }) => {
        insert(createSchema(name));
      }}
    />
  );
};