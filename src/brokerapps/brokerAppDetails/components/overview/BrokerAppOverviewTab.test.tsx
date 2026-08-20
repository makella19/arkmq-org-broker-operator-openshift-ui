import { render, screen } from '@testing-library/react';
import type { BrokerAppCR } from '../../../../k8s/types';
import { K8sResourceConditionStatus } from '../../../../k8s/types';
import { BrokerAppOverviewTab } from './BrokerAppOverviewTab';

const brokerApp: BrokerAppCR = {
  apiVersion: 'broker.arkmq.org/v1beta2',
  kind: 'BrokerApp',
  metadata: {
    name: 'my-payment-app',
    namespace: 'default',
    labels: { app: 'payment' },
  },
  spec: {
    capabilities: [
      {
        producerOf: [{ address: 'payment.transactions' }],
        consumerOf: [{ address: 'payment.requests' }],
      },
    ],
  },
  status: {
    service: {
      name: 'ex-aao',
      namespace: 'default',
      assignedPort: 61617,
    },
    conditions: [
      {
        type: 'Deployed',
        status: K8sResourceConditionStatus.True,
        reason: 'Provisioned',
        message: 'Application provisioned to broker',
      },
    ],
  },
};

describe('BrokerAppOverviewTab', () => {
  it('renders all sections when the CR is provided', () => {
    render(<BrokerAppOverviewTab obj={brokerApp} />);

    expect(screen.getByTestId('broker-app-overview-tab')).toBeInTheDocument();
    expect(screen.getByText('BrokerApp details')).toBeInTheDocument();
    expect(screen.getByTestId('resource-labels-and-annotations')).toBeInTheDocument();
    expect(screen.getByText('app=payment')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByTestId('broker-app-connection-information')).toBeInTheDocument();
    expect(screen.getByTestId('broker-app-messaging-capabilities')).toBeInTheDocument();
    expect(screen.getByTestId('resource-conditions-table')).toBeInTheDocument();
    expect(screen.getByText('Provisioned')).toBeInTheDocument();
    expect(screen.getByText('Application provisioned to broker')).toBeInTheDocument();
  });

  it('skips labels section when obj is not provided', () => {
    render(<BrokerAppOverviewTab />);

    expect(screen.getByTestId('broker-app-overview-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('resource-labels-and-annotations')).not.toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('No conditions')).toBeInTheDocument();
  });

  it('shows connection information when the app is provisioned', () => {
    render(<BrokerAppOverviewTab obj={brokerApp} />);
    // ClipboardCopy renders a TextInput — assert via display value.
    expect(screen.getByDisplayValue('ex-aao.default.svc.cluster.local')).toBeInTheDocument();
  });

  it('shows messaging capabilities', () => {
    render(<BrokerAppOverviewTab obj={brokerApp} />);
    expect(screen.getByTestId('producer-address-payment.transactions')).toBeInTheDocument();
    expect(screen.getByTestId('consumer-address-payment.requests')).toBeInTheDocument();
  });
});
