import type { FC } from 'react';
import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { Alert, PageSection, Stack, StackItem } from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import type { BrokerAppCR } from '../../../../k8s/types';
import type { OwnedResourceRow } from '../../../../shared-components/resourceDetails/resources/ResourcesTable';
import { ResourcesTable } from '../../../../shared-components/resourceDetails/resources/ResourcesTable';

export interface BrokerAppResourcesTabProps {
  /** Passed through HorizontalNav. */
  obj?: BrokerAppCR;
}

/** Core API resources have no group. */
const SECRET_GVK = { version: 'v1', kind: 'Secret' } as const;

/**
 * Watches Secrets in the namespace and filters by ownerReferences to surface
 * only resources the operator created for this BrokerApp.
 * Currently: {name}-binding-secret (host, port, AMQPS URI).
 */
export const BrokerAppResourcesTab: FC<BrokerAppResourcesTabProps> = ({ obj }) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const namespace = obj?.metadata?.namespace ?? '';
  const appName = obj?.metadata?.name ?? '';

  const [secrets, secretsLoaded, secretsError] = useK8sWatchResource<K8sResourceCommon[]>({
    groupVersionKind: { version: 'v1', kind: 'Secret' },
    isList: true,
    namespace: namespace || undefined,
  }) as [K8sResourceCommon[], boolean, unknown];

  const ownedSecrets: OwnedResourceRow[] = (Array.isArray(secrets) ? secrets : [])
    .filter((secret) =>
      (secret.metadata?.ownerReferences ?? []).some(
        (ref) => ref.kind === 'BrokerApp' && ref.name === appName,
      ),
    )
    .map((secret) => ({
      name: secret.metadata?.name ?? '',
      kind: 'Secret',
      namespace: secret.metadata?.namespace ?? namespace,
      groupVersionKind: SECRET_GVK,
      description: t('Broker connection details (host, port, AMQPS URI)'),
    }));

  return (
    <PageSection data-test="broker-app-resources-tab">
      <Stack hasGutter>
        <StackItem>
          <ResourcesTable
            resources={ownedSecrets}
            loaded={secretsLoaded}
            loadError={secretsError}
            dataTest="broker-app-resources-table"
          />
        </StackItem>
        <StackItem>
          <Alert variant="info" isInline title={t('Application Credentials')}>
            {t(
              'These resources provide secure connectivity to the bound broker service. The binding secret contains the connection details your application needs.',
            )}
          </Alert>
        </StackItem>
      </Stack>
    </PageSection>
  );
};
