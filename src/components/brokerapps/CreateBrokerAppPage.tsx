import * as React from 'react';
import { Suspense, useState } from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import {
  k8sCreate,
  useAccessReview,
  ResourceYAMLEditor,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  PageSection,
  Radio,
  Spinner,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { BrokerAppModel } from '../../k8s/models';
import { BrokerAppCapability, BrokerAppCR } from '../../k8s/types';
import './brokerapp.css';

// ── Types ────────────────────────────────────────────────────────────────────

type MatchLabel = { id: string; key: string; value: string };

type FormState = {
  name: string;
  matchLabels: MatchLabel[];
  producerOf: string[];
  consumerOf: string[];
  subscriberOf: string[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const initialFormState = (): FormState => ({
  name: '',
  matchLabels: [{ id: String(Date.now()), key: '', value: '' }],
  producerOf: [],
  consumerOf: [],
  subscriberOf: [],
});

const buildBrokerAppCR = (namespace: string, state: FormState): BrokerAppCR => {
  const capability: BrokerAppCapability = {};
  if (state.producerOf.length) {
    capability.producerOf = state.producerOf.map((a) => ({ address: a }));
  }
  if (state.consumerOf.length) {
    capability.consumerOf = state.consumerOf.map((a) => ({ address: a }));
  }
  if (state.subscriberOf.length) {
    capability.subscriberOf = state.subscriberOf.map((a) => ({ address: a }));
  }

  const matchLabels: { [k: string]: string } = {};
  state.matchLabels.forEach(({ key, value }) => {
    if (key) matchLabels[key] = value;
  });

  const spec: BrokerAppCR['spec'] = { acceptor: { port: 61616 } };
  if (Object.keys(matchLabels).length) {
    spec.selector = { matchLabels };
  }
  if (Object.keys(capability).length) {
    spec.capabilities = [capability];
  }

  return {
    apiVersion: 'broker.arkmq.org/v1beta2',
    kind: 'BrokerApp',
    metadata: { name: state.name, namespace },
    spec,
  };
};

// ── AddressListInput ──────────────────────────────────────────────────────────

type AddressListInputProps = {
  addresses: string[];
  onChange: (addresses: string[]) => void;
  placeholder: string;
  addLabel: string;
  inputId: string;
};

const AddressListInput: React.FC<AddressListInputProps> = ({
  addresses,
  onChange,
  placeholder,
  addLabel,
  inputId,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !addresses.includes(trimmed)) {
      onChange([...addresses, trimmed]);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="plugin__arkmq-org-broker-operator-openshift-ui__address-list">
      <div className="plugin__arkmq-org-broker-operator-openshift-ui__address-input-row">
        <TextInput
          id={inputId}
          value={inputValue}
          onChange={(_e, val) => setInputValue(val)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <Button variant="secondary" onClick={handleAdd}>
          {addLabel}
        </Button>
      </div>
      {addresses.length > 0 && (
        <ul className="plugin__arkmq-org-broker-operator-openshift-ui__address-chips">
          {addresses.map((addr) => (
            <li
              key={addr}
              className="plugin__arkmq-org-broker-operator-openshift-ui__address-chip"
            >
              <span>{addr}</span>
              <Button
                variant="plain"
                onClick={() => onChange(addresses.filter((a) => a !== addr))}
                aria-label={`Remove ${addr}`}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── CreateBrokerAppPage ───────────────────────────────────────────────────────

export default function CreateBrokerAppPage() {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { ns: namespace = '' } = useParams<{ ns: string }>();
  const history = useHistory();

  const [canCreate, canCreateLoading] = useAccessReview({
    group: 'broker.arkmq.org',
    resource: 'brokerapps',
    namespace,
    verb: 'create',
  });

  const [view, setView] = useState<'form' | 'yaml'>('form');
  const [formState, setFormState] = useState<FormState>(initialFormState());
  const [currentYaml, setCurrentYaml] = useState<string>('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = (cr: BrokerAppCR) => {
    setError('');
    setIsSubmitting(true);
    k8sCreate({ model: BrokerAppModel, data: cr })
      .then(() => {
        history.push(`/k8s/ns/${namespace}/broker.arkmq.org~v1beta2~BrokerApp`);
      })
      .catch((e: Error) => {
        setError(e.message);
        setIsSubmitting(false);
      });
  };

  const handleSubmitForm = () => {
    submit(buildBrokerAppCR(namespace, formState));
  };

  const handleSubmitYaml = () => {
    // If the user hasn't edited the YAML, fall back to the current form state
    if (!currentYaml) {
      submit(buildBrokerAppCR(namespace, formState));
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const jsYaml = require('js-yaml') as { load: (s: string) => unknown };
      const cr = jsYaml.load(currentYaml) as BrokerAppCR;
      submit(cr);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCancel = () => history.push(`/k8s/ns/${namespace}/broker.arkmq.org~v1beta2~BrokerApp`);

  const isFormValid = formState.name.trim() !== '';

  if (canCreateLoading) {
    return (
      <PageSection>
        <Spinner aria-label={t('Loading')} />
      </PageSection>
    );
  }

  if (!canCreate) {
    return (
      <PageSection>
        <Alert variant={AlertVariant.danger} title={t('Access denied')} isInline>
          {t(
            'You do not have permission to create BrokerApps in this namespace.',
          )}
        </Alert>
      </PageSection>
    );
  }

  const actionButtons = (
    <ActionGroup>
      <Button
        variant="primary"
        onClick={view === 'form' ? handleSubmitForm : handleSubmitYaml}
        isLoading={isSubmitting}
        isDisabled={isSubmitting || (view === 'form' && !isFormValid)}
      >
        {t('Create')}
      </Button>
      <Button variant="link" onClick={handleCancel} isDisabled={isSubmitting}>
        {t('Cancel')}
      </Button>
    </ActionGroup>
  );

  return (
    <>
      <Helmet>
        <title>{t('Create BrokerApp')}</title>
      </Helmet>
      <PageSection>
        <Title headingLevel="h1" data-test="create-brokerapp-title">{t('Create BrokerApp')}</Title>
      </PageSection>
      <PageSection>
        <div className="plugin__arkmq-org-broker-operator-openshift-ui__view-toggle">
          <Radio
            id="view-toggle-form"
            name="view-toggle"
            label={t('Form view')}
            isChecked={view === 'form'}
            onChange={() => setView('form')}
          />
          <Radio
            id="view-toggle-yaml"
            name="view-toggle"
            label={t('YAML view')}
            isChecked={view === 'yaml'}
            onChange={() => setView('yaml')}
          />
        </div>

        {error && (
          <Alert
            variant={AlertVariant.danger}
            isInline
            title={t('An error occurred')}
            className="plugin__arkmq-org-broker-operator-openshift-ui__error-alert"
          >
            {error}
          </Alert>
        )}

        {view === 'form' ? (
          <Form>
            <FormSection title={t('Application Details')}>
              <FormGroup label={t('Name')} isRequired fieldId="brokerapp-name">
                <TextInput
                  id="brokerapp-name"
                  value={formState.name}
                  onChange={(_e, val) =>
                    setFormState((s) => ({ ...s, name: val }))
                  }
                  isRequired
                  placeholder="my-messaging-app"
                  data-test="brokerapp-name"
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t('Unique name for the BrokerApp resource.')}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup
                label={t('Namespace')}
                fieldId="brokerapp-namespace"
              >
                <TextInput
                  id="brokerapp-namespace"
                  value={namespace}
                  isDisabled
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Use the project selector above to change the namespace.',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>

              <FormGroup
                label={t('Service Selector')}
                isRequired
                fieldId="brokerapp-selector"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Enter labels to match a BrokerService. Your app will be provisioned to a service with matching labels.',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <div className="plugin__arkmq-org-broker-operator-openshift-ui__labels-list">
                  {formState.matchLabels.map((label, i) => (
                    <div
                      key={label.id}
                      className="plugin__arkmq-org-broker-operator-openshift-ui__label-row"
                    >
                      <TextInput
                        value={label.key}
                        onChange={(_e, val) =>
                          setFormState((s) => {
                            const matchLabels = [...s.matchLabels];
                            matchLabels[i] = { ...matchLabels[i], key: val };
                            return { ...s, matchLabels };
                          })
                        }
                        placeholder={t('Key (e.g., tier)')}
                        aria-label={t('Label key')}
                      />
                      <span className="plugin__arkmq-org-broker-operator-openshift-ui__label-eq">
                        =
                      </span>
                      <TextInput
                        value={label.value}
                        onChange={(_e, val) =>
                          setFormState((s) => {
                            const matchLabels = [...s.matchLabels];
                            matchLabels[i] = { ...matchLabels[i], value: val };
                            return { ...s, matchLabels };
                          })
                        }
                        placeholder={t('Value (e.g., production)')}
                        aria-label={t('Label value')}
                      />
                      <Button
                        variant="plain"
                        onClick={() =>
                          setFormState((s) => ({
                            ...s,
                            matchLabels: s.matchLabels.filter(
                              (_, idx) => idx !== i,
                            ),
                          }))
                        }
                        aria-label={t('Remove label')}
                        isDisabled={formState.matchLabels.length === 1}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="link"
                  className="plugin__arkmq-org-broker-operator-openshift-ui__add-label-btn"
                  onClick={() =>
                    setFormState((s) => ({
                      ...s,
                      matchLabels: [
                        ...s.matchLabels,
                        { id: String(Date.now()), key: '', value: '' },
                      ],
                    }))
                  }
                >
                  + {t('Add Match Label')}
                </Button>
              </FormGroup>
            </FormSection>

            <FormSection title={t('Messaging Capabilities')}>
              <p className="plugin__arkmq-org-broker-operator-openshift-ui__section-desc">
                {t(
                  'Specify the addresses your application needs to interact with. Leave empty if not applicable.',
                )}
              </p>

              <FormGroup
                label={t('Produces To')}
                fieldId="brokerapp-produces"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t('Addresses where your application will send messages.')}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <AddressListInput
                  inputId="brokerapp-produces"
                  addresses={formState.producerOf}
                  onChange={(val) =>
                    setFormState((s) => ({ ...s, producerOf: val }))
                  }
                  placeholder="e.g., orders.created"
                  addLabel={t('Add')}
                />
              </FormGroup>

              <FormGroup
                label={t('Consumes From')}
                fieldId="brokerapp-consumes"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Queue addresses your application will consume messages from (point-to-point).',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <AddressListInput
                  inputId="brokerapp-consumes"
                  addresses={formState.consumerOf}
                  onChange={(val) =>
                    setFormState((s) => ({ ...s, consumerOf: val }))
                  }
                  placeholder="e.g., payments.pending"
                  addLabel={t('Add')}
                />
              </FormGroup>

              <FormGroup
                label={t('Subscribes To')}
                fieldId="brokerapp-subscribes"
              >
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {t(
                        'Topic addresses your application will subscribe to (publish-subscribe).',
                      )}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <AddressListInput
                  inputId="brokerapp-subscribes"
                  addresses={formState.subscriberOf}
                  onChange={(val) =>
                    setFormState((s) => ({ ...s, subscriberOf: val }))
                  }
                  placeholder="e.g., notifications.global"
                  addLabel={t('Add')}
                />
              </FormGroup>
            </FormSection>

            {actionButtons}
          </Form>
        ) : (
          <div className="plugin__arkmq-org-broker-operator-openshift-ui__yaml-view">
            <div className="plugin__arkmq-org-broker-operator-openshift-ui__yaml-editor-wrapper">
              <Suspense fallback={<Spinner aria-label={t('Loading editor')} />}>
                <ResourceYAMLEditor
                  initialResource={buildBrokerAppCR(namespace, formState)}
                  create
                  hideHeader
                  onChange={setCurrentYaml}
                />
              </Suspense>
            </div>
            {actionButtons}
          </div>
        )}
      </PageSection>
    </>
  );
}
