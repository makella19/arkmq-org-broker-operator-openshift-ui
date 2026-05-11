import * as React from 'react';
import { useReducer, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom-v5-compat';
import * as jsYaml from 'js-yaml';
import { k8sCreate, useAccessReview } from '@openshift-console/dynamic-plugin-sdk';
import {
  ActionGroup,
  Alert,
  AlertVariant,
  Button,
  Form,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { BrokerAppModel } from '../../k8s/models';
import { BrokerAppCR, EditorType } from '../../k8s/types';
import { validateDNS1123 } from '../../validation/k8s';
import {
  brokerAppReducer,
  createInitialBrokerAppState,
  BrokerAppFormStateContext,
  BrokerAppFormDispatchContext,
} from '../../reducers/brokerapp/reducer';
import { EditorToggle } from '../../shared-components/EditorToggle';
import { GeneralDetailsSection } from './components/GeneralDetailsSection';
import { SelectorSection } from './components/SelectorSection';
import { CapabilitiesSection } from './components/CapabilitiesSection';
import { YamlEditorWrapper } from '../../shared-components/YamlEditorWrapper';

export default function CreateBrokerAppPage() {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { ns: namespace = 'default' } = useParams<{ ns: string }>();
  const navigate = useNavigate();

  const [canCreate, canCreateLoading] = useAccessReview({
    group: 'broker.arkmq.org',
    resource: 'brokerapps',
    namespace,
    verb: 'create',
  });

  const [formState, dispatch] = useReducer(
    brokerAppReducer,
    createInitialBrokerAppState(namespace),
  );
  const yamlContentRef = useRef('');
  const yamlKeyRef = useRef(0);

  const handleYamlChange = useCallback((content: string) => {
    yamlContentRef.current = content;
  }, []);

  const onSelectEditorType = (editorType: EditorType) => {
    if (formState.editorType === EditorType.YAML && editorType === EditorType.FORM) {
      if (yamlContentRef.current) {
        try {
          const parsed = jsYaml.load(yamlContentRef.current) as BrokerAppCR;
          dispatch({ type: 'SET_MODEL', payload: parsed });
        } catch {
          dispatch({
            type: 'SET_SUBMIT_ERROR',
            payload: t('Cannot switch to Form view: YAML is not valid'),
          });
          return;
        }
      }
    }
    if (editorType === EditorType.YAML) {
      yamlKeyRef.current += 1;
    }
    dispatch({ type: 'SET_EDITOR_TYPE', payload: editorType });
  };

  const { cr, isSubmitting, submitError } = formState;
  const isFormValid = validateDNS1123(cr.metadata?.name ?? '') === null;

  const submit = (crToSubmit: BrokerAppCR) => {
    dispatch({ type: 'SET_SUBMITTING', payload: true });
    k8sCreate({ model: BrokerAppModel, data: crToSubmit })
      .then(() => navigate(`/k8s/ns/${namespace}/broker.arkmq.org~v1beta2~BrokerApp`))
      .catch((e: Error) => dispatch({ type: 'SET_SUBMIT_ERROR', payload: e.message }))
      .finally(() => dispatch({ type: 'SET_SUBMITTING', payload: false }));
  };

  const handleSubmit = () => {
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: undefined });
    if (!isFormValid) return;
    submit(cr);
  };

  const handleYamlSave = (content: string) => {
    if (isSubmitting) return;
    dispatch({ type: 'SET_SUBMIT_ERROR', payload: undefined });
    try {
      submit(jsYaml.load(content) as BrokerAppCR);
    } catch (e) {
      dispatch({ type: 'SET_SUBMIT_ERROR', payload: (e as Error).message });
    }
  };

  const handleCancel = () => navigate(`/k8s/ns/${namespace}/broker.arkmq.org~v1beta2~BrokerApp`);

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
          {t('You do not have permission to create BrokerApps in this namespace.')}
        </Alert>
      </PageSection>
    );
  }

  const actionButtons = (
    <ActionGroup>
      <Button
        variant="primary"
        onClick={handleSubmit}
        isLoading={isSubmitting}
        isDisabled={isSubmitting || !isFormValid}
      >
        {t('Create')}
      </Button>
      <Button variant="link" onClick={handleCancel} isDisabled={isSubmitting}>
        {t('Cancel')}
      </Button>
    </ActionGroup>
  );

  return (
    <BrokerAppFormStateContext.Provider value={formState}>
      <BrokerAppFormDispatchContext.Provider value={dispatch}>
        <>
          <PageSection>
            <Title headingLevel="h1" data-test="create-brokerapp-title">
              {t('Create BrokerApp')}
            </Title>
          </PageSection>
          <PageSection>
            <Stack hasGutter>
              <StackItem>
                <EditorToggle
                  value={formState.editorType}
                  onChange={onSelectEditorType}
                  isDisabled={isSubmitting}
                />
              </StackItem>

              {submitError && (
                <StackItem>
                  <Alert variant={AlertVariant.danger} isInline title={t('An error occurred')}>
                    {submitError}
                  </Alert>
                </StackItem>
              )}

              {formState.editorType === EditorType.FORM ? (
                <StackItem>
                  <Form>
                    <GeneralDetailsSection namespace={namespace} />
                    <SelectorSection />
                    <CapabilitiesSection />
                    {actionButtons}
                  </Form>
                </StackItem>
              ) : (
                <StackItem>
                  <YamlEditorWrapper
                    key={yamlKeyRef.current}
                    initialResource={formState.cr}
                    onChange={handleYamlChange}
                    onSave={handleYamlSave}
                  />
                </StackItem>
              )}
            </Stack>
          </PageSection>
        </>
      </BrokerAppFormDispatchContext.Provider>
    </BrokerAppFormStateContext.Provider>
  );
}
