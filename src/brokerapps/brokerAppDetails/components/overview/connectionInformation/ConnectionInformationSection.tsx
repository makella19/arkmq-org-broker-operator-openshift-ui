import type { FC } from 'react';
import {
  Alert,
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import type { BrokerAppServiceBinding } from '../../../../../k8s/types';

export interface ConnectionInformationSectionProps {
  /** Undefined when the app is not yet provisioned. */
  service?: BrokerAppServiceBinding;
}

/**
 * Host is derived as {serviceName}.{serviceNamespace}.svc.cluster.local,
 * matching the pattern the operator writes to the binding secret.
 * Connectivity test button is disabled pending cert-manager client cert integration.
 */
export const ConnectionInformationSection: FC<ConnectionInformationSectionProps> = ({
  service,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

  if (!service) {
    return (
      <div data-test="broker-app-connection-information">
        <Title headingLevel="h2" className="pf-v6-u-mb-md">
          {t('Connection Information')}
        </Title>
        <Alert
          variant="info"
          isInline
          title={t('Not yet provisioned')}
          data-test="broker-app-connection-not-provisioned"
        >
          {t('This application has not been provisioned to a broker service yet.')}
        </Alert>
      </div>
    );
  }

  const host = `${service.name}.${service.namespace}.svc.cluster.local`;
  const port = String(service.assignedPort);
  const uri = `amqps://${host}:${port}`;

  return (
    <div data-test="broker-app-connection-information">
      <Title headingLevel="h2" className="pf-v6-u-mb-md">
        {t('Connection Information')}
      </Title>
      <DescriptionList isHorizontal>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Broker Host')}</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              isReadOnly
              variant={ClipboardCopyVariant.inline}
              data-test="broker-app-connection-host"
            >
              {host}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Assigned Port')}</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              isReadOnly
              variant={ClipboardCopyVariant.inline}
              data-test="broker-app-connection-port"
            >
              {port}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{t('AMQPS URI')}</DescriptionListTerm>
          <DescriptionListDescription>
            <ClipboardCopy
              isReadOnly
              variant={ClipboardCopyVariant.inline}
              data-test="broker-app-connection-uri"
            >
              {uri}
            </ClipboardCopy>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      <Divider className="pf-v6-u-mt-md pf-v6-u-mb-md" />

      <Stack hasGutter>
        <StackItem>
          <Title headingLevel="h3">{t('Validate connectivity')}</Title>
        </StackItem>
        <StackItem>
          <Content component="p">
            {t("Test the connection to the broker service using this application's credentials.")}
          </Content>
        </StackItem>
        <StackItem>
          <Tooltip content={t('Not yet available')}>
            <Button variant="primary" isDisabled data-test="broker-app-run-connectivity-test">
              {t('Run Connectivity Test')}
            </Button>
          </Tooltip>
        </StackItem>
      </Stack>
    </div>
  );
};
