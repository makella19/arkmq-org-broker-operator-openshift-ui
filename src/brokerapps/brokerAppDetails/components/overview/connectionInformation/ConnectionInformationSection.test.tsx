import { render, screen } from '@testing-library/react';
import type { BrokerAppServiceBinding } from '../../../../../k8s/types';
import { ConnectionInformationSection } from './ConnectionInformationSection';

const service: BrokerAppServiceBinding = {
  name: 'ex-aao',
  namespace: 'default',
  assignedPort: 61617,
};

describe('ConnectionInformationSection', () => {
  it('shows not-provisioned alert when service is undefined', () => {
    render(<ConnectionInformationSection />);
    expect(screen.getByTestId('broker-app-connection-not-provisioned')).toBeInTheDocument();
  });

  it('renders host, port, and URI when service is provided', () => {
    render(<ConnectionInformationSection service={service} />);
    // ClipboardCopy renders a TextInput — assert via display value, not text content.
    expect(screen.getByDisplayValue('ex-aao.default.svc.cluster.local')).toBeInTheDocument();
    expect(screen.getByDisplayValue('61617')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('amqps://ex-aao.default.svc.cluster.local:61617'),
    ).toBeInTheDocument();
  });

  it('shows the connectivity test button', () => {
    render(<ConnectionInformationSection service={service} />);
    expect(screen.getByTestId('broker-app-run-connectivity-test')).toBeInTheDocument();
  });

  it('shows the connectivity test button as disabled', () => {
    render(<ConnectionInformationSection service={service} />);
    expect(screen.getByTestId('broker-app-run-connectivity-test')).toBeDisabled();
  });
});
