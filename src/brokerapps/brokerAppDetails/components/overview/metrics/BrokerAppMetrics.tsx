import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { MetricsLayout } from '../../../../../shared-components/resourceDetails/metrics/MetricsLayout';
import { MetricsType } from '../../../../../shared-components/resourceDetails/metrics/metricsTypes';

/**
 * Infrastructure metrics (memory, CPU) belong to BrokerService, not the app.
 * Placeholder charts pending Prometheus integration.
 */
export const BrokerAppMetrics: FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

  return (
    <MetricsLayout
      dataTestPrefix="broker-app-metric"
      metricsFilterOptions={[
        { value: MetricsType.AllMetrics, label: t('All Metrics') },
        { value: MetricsType.BrokerMetrics, label: t('Broker Metrics') },
      ]}
      charts={[
        {
          id: 'queue-depth',
          title: t('Queue Depth'),
          metricsType: MetricsType.BrokerMetrics,
        },
        {
          id: 'consumer-count',
          title: t('Consumer Count'),
          metricsType: MetricsType.BrokerMetrics,
        },
      ]}
    />
  );
};
