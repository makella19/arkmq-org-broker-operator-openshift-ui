import { render, screen } from '@testing-library/react';
import type { BrokerAppCapability } from '../../../../../k8s/types';
import { MessagingCapabilitiesSection } from './MessagingCapabilitiesSection';

describe('MessagingCapabilitiesSection', () => {
  it('shows empty state for both columns when no capabilities are provided', () => {
    render(<MessagingCapabilitiesSection />);
    expect(screen.getByTestId('broker-app-messaging-capabilities')).toBeInTheDocument();
    expect(screen.getAllByText('No addresses configured')).toHaveLength(2);
  });

  it('shows empty state when capabilities array is empty', () => {
    render(<MessagingCapabilitiesSection capabilities={[]} />);
    expect(screen.getAllByText('No addresses configured')).toHaveLength(2);
  });

  it('renders producer addresses as blue labels', () => {
    const capabilities: BrokerAppCapability[] = [
      { producerOf: [{ address: 'payment.transactions' }, { address: 'payment.confirmations' }] },
    ];
    render(<MessagingCapabilitiesSection capabilities={capabilities} />);
    expect(screen.getByTestId('producer-address-payment.transactions')).toHaveTextContent(
      'payment.transactions',
    );
    expect(screen.getByTestId('producer-address-payment.confirmations')).toHaveTextContent(
      'payment.confirmations',
    );
    // Consumer column is empty
    expect(screen.getByText('No addresses configured')).toBeInTheDocument();
  });

  it('renders consumer addresses as green labels', () => {
    const capabilities: BrokerAppCapability[] = [{ consumerOf: [{ address: 'payment.requests' }] }];
    render(<MessagingCapabilitiesSection capabilities={capabilities} />);
    expect(screen.getByTestId('consumer-address-payment.requests')).toHaveTextContent(
      'payment.requests',
    );
  });

  it('prefixes cross-app address references with the owning app name', () => {
    const capabilities: BrokerAppCapability[] = [
      {
        consumerOf: [{ address: 'orders', appName: 'order-service' }],
      },
    ];
    render(<MessagingCapabilitiesSection capabilities={capabilities} />);
    expect(screen.getByTestId('consumer-address-order-service/orders')).toHaveTextContent(
      'order-service/orders',
    );
  });

  it('flattens addresses across multiple capability entries', () => {
    const capabilities: BrokerAppCapability[] = [
      { producerOf: [{ address: 'addr-a' }] },
      { producerOf: [{ address: 'addr-b' }] },
    ];
    render(<MessagingCapabilitiesSection capabilities={capabilities} />);
    expect(screen.getByTestId('producer-address-addr-a')).toBeInTheDocument();
    expect(screen.getByTestId('producer-address-addr-b')).toBeInTheDocument();
  });
});
