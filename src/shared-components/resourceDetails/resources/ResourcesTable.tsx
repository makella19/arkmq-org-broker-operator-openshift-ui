import type { FC } from 'react';
import { useMemo } from 'react';
import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  ListPageBody,
  ListPageHeader,
  ResourceLink,
  Timestamp,
} from '@openshift-console/dynamic-plugin-sdk';
import type { DataViewTr } from '@patternfly/react-data-view';
import { useTranslation } from 'react-i18next';
import { ResourceListDataView } from '../../resourceList/ResourceListDataView';

export interface OwnedResourceRowOptions {
  /** Translated status label (e.g. 'Created', 'Approved'). Derived by caller from resource conditions. */
  statusLabel: string;
  /** Translated description of the resource's role in the CR lifecycle. */
  descriptionLabel: string;
}

/**
 * Builds a DataViewTr row for a single operator-owned resource.
 * Columns: Name, Kind, Status, Description, Created.
 *
 * Kind and GVK are derived from the resource itself. Status and description
 * are passed in by the caller since they depend on resource-type business logic.
 */
export const OwnedResourceRow = (
  resource: K8sResourceCommon,
  { statusLabel, descriptionLabel }: OwnedResourceRowOptions,
): DataViewTr => {
  const name = resource.metadata?.name ?? '';
  const namespace = resource.metadata?.namespace ?? '';
  const kind = resource.kind ?? '';
  const apiVersion = resource.apiVersion ?? 'v1';
  const [group, version] = apiVersion.includes('/') ? apiVersion.split('/') : ['', apiVersion];

  return [
    {
      cell: (
        <ResourceLink
          groupVersionKind={{ group, version, kind }}
          name={name}
          namespace={namespace}
          dataTest={`resource-link-${name}`}
        />
      ),
    },
    { cell: kind },
    { cell: statusLabel },
    { cell: descriptionLabel },
    {
      cell: resource.metadata?.creationTimestamp ? (
        <Timestamp timestamp={resource.metadata.creationTimestamp} />
      ) : (
        '-'
      ),
    },
  ];
};

export interface ResourcesTableProps {
  /**
   * Full K8sResourceCommon objects — caller fetches and filters by owner reference.
   * Passed directly to ResourceListDataView; no data is lost before the table sees it.
   */
  resources: K8sResourceCommon[];
  loaded: boolean;
  loadError?: unknown;
  /** Row renderer — use OwnedResourceRow with resource-type-specific options. */
  renderRow: (resource: K8sResourceCommon) => DataViewTr;
  /** Column headers. Defaults to [Name, Kind, Status, Description, Created]. */
  columns?: string[];
  dataTest?: string;
}

/** Shared Resources table for CR detail tabs. BrokerService Resources tab will reuse this. */
export const ResourcesTable: FC<ResourcesTableProps> = ({
  resources,
  loaded,
  loadError,
  renderRow,
  columns: columnsProp,
  dataTest = 'resources-table',
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

  const defaultColumns = useMemo(
    () => [t('Name'), t('Kind'), t('Status'), t('Description'), t('Created')],
    [t],
  );
  const columns = columnsProp ?? defaultColumns;

  return (
    <div data-test={dataTest}>
      <ListPageHeader title={t('Resources')} hideFavoriteButton />
      <ListPageBody>
        <ResourceListDataView
          data={resources}
          loaded={loaded}
          loadError={loadError}
          columns={columns}
          renderRow={renderRow}
          ariaLabel={t('Resources')}
          ouiaId="ResourcesTable"
          dataViewOuiaId="ResourcesDataView"
          toolbarOuiaId="ResourcesToolbar"
          emptyTitle={t('No resources')}
          paginationAriaLabel={t('Resources pagination')}
          nameFilterDataTest={`${dataTest}-name-filter`}
        />
      </ListPageBody>
    </div>
  );
};
