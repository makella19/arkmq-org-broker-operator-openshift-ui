import { render, screen } from '@testing-library/react';
import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { OwnedResourceRow, ResourcesTable } from './ResourcesTable';

const secret: K8sResourceCommon = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'my-app-binding-secret',
    namespace: 'default',
    creationTimestamp: '2026-01-01T00:00:00Z',
  },
};

const renderRow = (resource: K8sResourceCommon) =>
  OwnedResourceRow(resource, {
    statusLabel: 'Created',
    descriptionLabel: 'Broker connection details',
  });

describe('ResourcesTable', () => {
  it('shows a spinner while loading', () => {
    render(<ResourcesTable resources={[]} loaded={false} renderRow={renderRow} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error state when the watch fails', () => {
    render(
      <ResourcesTable
        resources={[]}
        loaded={true}
        loadError={new Error('fail')}
        renderRow={renderRow}
      />,
    );
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('shows empty text when there are no resources', () => {
    render(<ResourcesTable resources={[]} loaded={true} renderRow={renderRow} />);
    expect(screen.getByText('No resources')).toBeInTheDocument();
  });

  it('renders a row with name, kind, status, and description', () => {
    render(<ResourcesTable resources={[secret]} loaded={true} renderRow={renderRow} />);
    expect(screen.getByTestId('resource-link-my-app-binding-secret')).toHaveTextContent(
      'my-app-binding-secret',
    );
    expect(screen.getByText('Broker connection details')).toBeInTheDocument();
  });

  it('renders the name filter input', () => {
    render(<ResourcesTable resources={[secret]} loaded={true} renderRow={renderRow} />);
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
  });
});
