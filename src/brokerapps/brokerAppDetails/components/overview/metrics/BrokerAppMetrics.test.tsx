import { render, screen } from '@testing-library/react';
import { BrokerAppMetrics } from './BrokerAppMetrics';

describe('BrokerAppMetrics', () => {
  it('renders the Metrics section heading', () => {
    render(<BrokerAppMetrics />);
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });

  it('renders both chart placeholders', () => {
    render(<BrokerAppMetrics />);
    expect(screen.getByTestId('broker-app-metric-queue-depth')).toBeInTheDocument();
    expect(screen.getByTestId('broker-app-metric-consumer-count')).toBeInTheDocument();
  });
});
