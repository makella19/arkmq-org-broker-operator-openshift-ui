import type { FC } from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  Title,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import type { BrokerAppCapability } from '../../../../../k8s/types';

export interface MessagingCapabilitiesSectionProps {
  capabilities?: BrokerAppCapability[];
}

/**
 * Cross-app address references are displayed as appName/address.
 * subscriberOf was removed from the operator spec; only two columns are shown.
 */
export const MessagingCapabilitiesSection: FC<MessagingCapabilitiesSectionProps> = ({
  capabilities,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

  const producerAddresses = (capabilities ?? []).flatMap((cap) =>
    (cap.producerOf ?? []).map((ref) =>
      ref.appName ? `${ref.appName}/${ref.address}` : ref.address,
    ),
  );

  const consumerAddresses = (capabilities ?? []).flatMap((cap) =>
    (cap.consumerOf ?? []).map((ref) =>
      ref.appName ? `${ref.appName}/${ref.address}` : ref.address,
    ),
  );

  return (
    <div data-test="broker-app-messaging-capabilities">
      <Title headingLevel="h2" className="pf-v6-u-mb-md">
        {t('Messaging Capabilities')}
      </Title>
      <Grid hasGutter>
        <GridItem span={6}>
          <Card>
            <CardTitle>{t('Produces To')}</CardTitle>
            <CardBody>
              {producerAddresses.length === 0 ? (
                <span className="pf-v6-u-color-200">{t('No addresses configured')}</span>
              ) : (
                <LabelGroup categoryName={t('Produces To')}>
                  {producerAddresses.map((addr, i) => (
                    <Label
                      key={`${addr}-${String(i)}`}
                      color="blue"
                      data-test={`producer-address-${addr}`}
                    >
                      {addr}
                    </Label>
                  ))}
                </LabelGroup>
              )}
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card>
            <CardTitle>{t('Consumes From')}</CardTitle>
            <CardBody>
              {consumerAddresses.length === 0 ? (
                <span className="pf-v6-u-color-200">{t('No addresses configured')}</span>
              ) : (
                <LabelGroup categoryName={t('Consumes From')}>
                  {consumerAddresses.map((addr, i) => (
                    <Label
                      key={`${addr}-${String(i)}`}
                      color="green"
                      data-test={`consumer-address-${addr}`}
                    >
                      {addr}
                    </Label>
                  ))}
                </LabelGroup>
              )}
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </div>
  );
};
