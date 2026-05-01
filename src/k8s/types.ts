import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type MatchAddress = {
  address: string;
};

export type BrokerAppCapability = {
  producerOf?: MatchAddress[];
  consumerOf?: MatchAddress[];
  subscriberOf?: MatchAddress[];
};

export type BrokerAppSpec = {
  acceptor: { port: number };
  selector?: { matchLabels?: { [key: string]: string } };
  capabilities?: BrokerAppCapability[];
};

export type BrokerAppCR = K8sResourceCommon & {
  spec: BrokerAppSpec;
};
