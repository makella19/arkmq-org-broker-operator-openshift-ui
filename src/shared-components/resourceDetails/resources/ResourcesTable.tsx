import type { FC } from 'react';
import { useState } from 'react';
import { ResourceLink } from '@openshift-console/dynamic-plugin-sdk';
import { Spinner, TextInput, Title } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { useTranslation } from 'react-i18next';

export interface OwnedResourceRow {
  name: string;
  kind: string;
  /** Required by ResourceLink. */
  namespace: string;
  /** When provided, renders the name as a console ResourceLink instead of plain text. */
  groupVersionKind?: { group?: string; version: string; kind: string };
  description?: string;
}

export interface ResourcesTableProps {
  /** Caller is responsible for fetching and filtering (e.g. by owner reference). */
  resources: OwnedResourceRow[];
  loaded: boolean;
  loadError?: unknown;
  dataTest?: string;
}

/** Shared table for operator-owned resources; BrokerService Resources tab will reuse this. */
export const ResourcesTable: FC<ResourcesTableProps> = ({
  resources,
  loaded,
  loadError,
  dataTest = 'resources-table',
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const [nameFilter, setNameFilter] = useState('');

  const heading = t('Resources');

  const visibleRows = nameFilter
    ? resources.filter((r) => r.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : resources;

  return (
    <div data-test={dataTest}>
      <Title headingLevel="h2" className="pf-v6-u-mb-md">
        {heading}
      </Title>

      <TextInput
        aria-label={t('Filter by name')}
        placeholder={t('Search by name...')}
        value={nameFilter}
        onChange={(_event, value) => {
          setNameFilter(value);
        }}
        className="pf-v6-u-mb-md"
        data-test={`${dataTest}-name-filter`}
      />

      {!loaded ? (
        <Spinner aria-label={t('Loading resources')} />
      ) : loadError ? (
        <Table aria-label={heading} variant="compact">
          <Tbody>
            <Tr>
              <Td colSpan={3}>{t('An error occurred loading resources')}</Td>
            </Tr>
          </Tbody>
        </Table>
      ) : (
        <Table aria-label={heading} variant="compact">
          <Thead>
            <Tr>
              <Th>{t('Name')}</Th>
              <Th>{t('Kind')}</Th>
              <Th>{t('Description')}</Th>
            </Tr>
          </Thead>
          <Tbody>
            {visibleRows.length === 0 ? (
              <Tr>
                <Td colSpan={3}>
                  {nameFilter ? t('No resources match the filter') : t('No resources')}
                </Td>
              </Tr>
            ) : (
              visibleRows.map((row) => (
                <Tr key={`${row.namespace}-${row.kind}-${row.name}`}>
                  <Td dataLabel={t('Name')}>
                    {row.groupVersionKind ? (
                      <ResourceLink
                        groupVersionKind={row.groupVersionKind}
                        name={row.name}
                        namespace={row.namespace}
                        dataTest={`resource-link-${row.name}`}
                      />
                    ) : (
                      row.name
                    )}
                  </Td>
                  <Td dataLabel={t('Kind')}>{row.kind}</Td>
                  <Td dataLabel={t('Description')}>{row.description ?? '-'}</Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      )}
    </div>
  );
};
