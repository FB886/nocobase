import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ActionContextProvider, AdminProvider, RemoteSchemaComponent, useRoute, useViewport } from '@nocobase/client';
import { css, cx } from '@emotion/css';
import { useInterfaceContext } from './InterfaceProvider';
import { DrawerProps, ModalProps } from 'antd';
import { MobileCore } from '../core';

const commonCSSVariables = css`
  --nb-spacing: 14px;
`;
const commonCSSOverride = css``;
const commonDesignerCSS = css`
  --nb-designer-top: 2px;
  --nb-designer-right: 2px;
  .nb-sortable-designer:hover {
    position: relative;
    > .general-schema-designer {
      display: block;
    }
  }
  .general-schema-designer {
    position: absolute;
    z-index: 999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    display: none;
    border: 0;
    pointer-events: none;
    > .general-schema-designer-icons {
      position: absolute;
      top: var(--nb-designer-top);
      right: var(--nb-designer-right);
      line-height: 16px;
      pointer-events: all;
      .ant-space-item {
        background-color: #f18b62;
        color: #fff;
        line-height: 16px;
        width: 16px;
        padding-left: 1px;
      }
    }
  }
`;

const drawerProps: DrawerProps = {
  getContainer: '.nb-mobile-application',
  width: '90%',
  style: {
    position: 'absolute',
  },
};
const modalProps = {
  ...drawerProps,
  style: {
    maxWidth: 'calc(100% - 16px)',
  },
  maskStyle: {
    position: 'absolute',
  },
  wrapClassName: css`
    position: absolute;
  `,
};

const MApplication: React.FC = (props) => {
  const route = useRoute();
  const params = useParams<{ name: string }>();
  const interfaceContext = useInterfaceContext();
  const Provider = useMemo(() => {
    return interfaceContext ? React.Fragment : AdminProvider;
  }, [interfaceContext]);

  useViewport();

  return (
    <Provider>
      <MobileCore>
        <ActionContextProvider modalProps={modalProps as ModalProps} drawerProps={drawerProps}>
          <div
            className={cx(
              'nb-mobile-application',
              commonDesignerCSS,
              commonCSSVariables,
              commonCSSOverride,
              css`
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
              `,
            )}
          >
            {params.name && !params.name.startsWith('tab_') ? (
              props.children
            ) : (
              <RemoteSchemaComponent key={route.uiSchemaUid} uid={route.uiSchemaUid}>
                {props.children}
              </RemoteSchemaComponent>
            )}
            <div id="nb-position-container"></div>
          </div>
        </ActionContextProvider>
      </MobileCore>
    </Provider>
  );
};

export default MApplication;
