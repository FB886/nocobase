import { i18n, PluginManagerContext, RouteSwitchContext, SettingsCenterProvider } from '@nocobase/client';
import { Select } from 'antd';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';

const ns = '@nocobase/plugin-sample-shop-i18n';

i18n.addResources('zh-CN', ns, {
  Shop: '店铺',
  I18n: '国际化',
  Pending: '已下单',
  Paid: '已支付',
  Delivered: '已发货',
  Received: '已签收',
});

const ORDER_STATUS_LIST = [
  { value: -1, label: 'Canceled (untranslated)' },
  { value: 0, label: 'Pending' },
  { value: 1, label: 'Paid' },
  { value: 2, label: 'Delivered' },
  { value: 3, label: 'Received' },
];

function OrderStatusSelect() {
  const { t } = useTranslation(ns);

  return (
    <Select style={{ minWidth: '8em' }}>
      {ORDER_STATUS_LIST.map((item) => (
        <Select.Option key={item.value} value={item.value}>
          {t(item.label)}
        </Select.Option>
      ))}
    </Select>
  );
}

const ShopI18n = React.memo((props) => {
  const ctx = useContext(PluginManagerContext);
  const { routes, components, ...others } = useContext(RouteSwitchContext);

  return (
    <SettingsCenterProvider
      settings={{
        workflow: {
          icon: 'ShopOutlined',
          title: `{{t("Shop", { ns: "${ns}" })}}`,
          tabs: {
            workflows: {
              title: `{{t("I18n", { ns: "${ns}" })}}`,
              component: OrderStatusSelect,
            },
          },
        },
      }}
    >
      <PluginManagerContext.Provider
        value={{
          components: {
            ...ctx?.components,
          },
        }}
      >
        <RouteSwitchContext.Provider value={{ components: { ...components }, ...others, routes }}>
          {props.children}
        </RouteSwitchContext.Provider>
      </PluginManagerContext.Provider>
    </SettingsCenterProvider>
  );
});

export default ShopI18n;
