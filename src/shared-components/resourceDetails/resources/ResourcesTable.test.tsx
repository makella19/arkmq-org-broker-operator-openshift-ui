import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OwnedResourceRow } from './ResourcesTable';
import { ResourcesTable } from './ResourcesTable';

const rows: OwnedResourceRow[] = [
  {
    name: 'my-app-binding-secret',
    kind: 'Secret',
    namespace: 'default',
    groupVersionKind: { version: 'v1', kind: 'Secret' },
    description: 'Broker connection details',
  },
  {
    name: 'my-app-config',
    kind: 'ConfigMap',
    namespace: 'default',
    groupVersionKind: { version: 'v1', kind: 'ConfigMap' },
    description: 'Connection configuration',
  },
];

describe('ResourcesTable', () => {
  it('shows a spinner while loading', () => {
    render(<ResourcesTable resources={[]} loaded={false} />);
    expect(screen.getByRole('progressbar', { name: 'Loading resources' })).toBeInTheDocument();
  });

  it('shows an error row when the watch fails', () => {
    render(<ResourcesTable resources={[]} loaded={true} loadError={new Error('fail')} />);
    expect(screen.getByText('An error occurred loading resources')).toBeInTheDocument();
  });

  it('shows empty text when there are no resources', () => {
    render(<ResourcesTable resources={[]} loaded={true} />);
    expect(screen.getByText('No resources')).toBeInTheDocument();
  });

  it('renders rows with name, kind, and description', () => {
    render(<ResourcesTable resources={rows} loaded={true} />);
    expect(screen.getByTestId('resource-link-my-app-binding-secret')).toHaveTextContent(
      'my-app-binding-secret',
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
    expect(screen.getByText('Broker connection details')).toBeInTheDocument();
    expect(screen.getByTestId('resource-link-my-app-config')).toHaveTextContent('my-app-config');
    expect(screen.getByText('ConfigMap')).toBeInTheDocument();
  });

  it('filters rows by name on input', async () => {
    render(<ResourcesTable resources={rows} loaded={true} />);
    const filter = screen.getByPlaceholderText('Search by name...');
    await userEvent.type(filter, 'binding');
    expect(screen.getByText('my-app-binding-secret')).toBeInTheDocument();
    expect(screen.queryByText('my-app-config')).not.toBeInTheDocument();
  });

  it('shows no-match text when the filter returns nothing', async () => {
    render(<ResourcesTable resources={rows} loaded={true} />);
    const filter = screen.getByPlaceholderText('Search by name...');
    await userEvent.type(filter, 'zzz-nonexistent');
    expect(screen.getByText('No resources match the filter')).toBeInTheDocument();
  });

  it('renders the name as plain text when no groupVersionKind is supplied', () => {
    const plainRow: OwnedResourceRow = {
      name: 'plain-resource',
      kind: 'Unknown',
      namespace: 'default',
    };
    render(<ResourcesTable resources={[plainRow]} loaded={true} />);
    expect(screen.getByText('plain-resource')).toBeInTheDocument();
    expect(screen.queryByTestId('resource-link-plain-resource')).not.toBeInTheDocument();
  });
});
