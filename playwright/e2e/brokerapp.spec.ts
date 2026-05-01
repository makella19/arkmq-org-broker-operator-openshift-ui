import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import {
  kubectl,
  sleep,
  waitForCondition,
  createNamespace,
  deleteNamespace,
  applyYaml,
  secretExists,
} from '../fixtures/k8s';

// Set TEST_BROKERAPP_BINDING=true to run tests that require a running BrokerService pod (slow).
// Without this flag, only the non-matching-labels and UI form tests run.
const shouldTestBinding = process.env.TEST_BROKERAPP_BINDING === 'true';

// apiVersion used for BrokerApp CRs — must match the installed CRD group.
const BROKERAPP_API = 'broker.arkmq.org/v1beta2';
// BrokerService uses a different API group (see certificate-management.spec.ts).
const BROKERSERVICE_API = 'arkmq.org/v1beta2';

const TEST_NAMESPACE = 'brokerapp-e2e-test';
const SERVICE_NAME = 'e2e-broker-service';

// ── Lifecycle tests (kubectl-only, no browser) ───────────────────────────────

test.describe('BrokerApp lifecycle', () => {
  test.beforeAll(() => {
    createNamespace(TEST_NAMESPACE);
    console.log('\nStarting BrokerApp lifecycle tests\n');
  });

  test.afterAll(() => {
    kubectl(`delete brokerapps --all -n ${TEST_NAMESPACE} --ignore-not-found=true`, {
      ignoreError: true,
    });
    deleteNamespace(TEST_NAMESPACE);
    console.log('\nCleanup complete\n');
  });

  // ── Test: Create app with matching labels → verify it binds to correct service ──

  test('matching labels - binds to correct BrokerService', async () => {
    test.skip(
      !shouldTestBinding,
      'Skipping binding test. Set TEST_BROKERAPP_BINDING=true to enable.',
    );

    // 1. Deploy a BrokerService with a specific label
    const brokerServiceYaml = `
apiVersion: ${BROKERSERVICE_API}
kind: BrokerService
metadata:
  name: ${SERVICE_NAME}
  namespace: ${TEST_NAMESPACE}
  labels:
    tier: e2e
spec:
  resources:
    limits:
      memory: "256Mi"
`;
    applyYaml(brokerServiceYaml);
    console.log(`✓ Applied BrokerService ${SERVICE_NAME} with label tier=e2e`);

    // 2. Create a BrokerApp whose selector matches that label
    const appName = 'e2e-app-matching';
    const brokerAppYaml = `
apiVersion: ${BROKERAPP_API}
kind: BrokerApp
metadata:
  name: ${appName}
  namespace: ${TEST_NAMESPACE}
spec:
  selector:
    matchLabels:
      tier: e2e
  acceptor:
    port: 61616
  capabilities:
  - producerOf:
    - address: "QUEUE.ORDERS"
`;
    applyYaml(brokerAppYaml);
    console.log(`✓ Applied BrokerApp ${appName} with selector tier=e2e`);

    // 3. Wait for the broker pod to be ready, then for the BrokerApp to be Deployed
    console.log('\nWaiting for BrokerApp to be Deployed (binding + provisioning)...');
    await waitForCondition('brokerapp', appName, TEST_NAMESPACE, 'Deployed', 'True', 600000);
    console.log(`✓ BrokerApp ${appName} is Deployed`);

    // 4. Verify the status references the expected BrokerService
    const statusOutput = kubectl(
      `get brokerapp ${appName} -n ${TEST_NAMESPACE} -o jsonpath='{.status}'`,
    );
    expect(statusOutput).toContain(SERVICE_NAME);
    console.log(`✓ BrokerApp status references ${SERVICE_NAME}`);
  });

  // ── Test: Verify credentials secret is created after provisioning ────────────

  test('credentials secret created after provisioning', async () => {
    test.skip(
      !shouldTestBinding,
      'Skipping binding test. Set TEST_BROKERAPP_BINDING=true to enable.',
    );

    // Depends on the matching-labels test having run (same namespace, same app name).
    const appName = 'e2e-app-matching';
    const secretName = `${appName}-binding-secret`;

    expect(secretExists(secretName, TEST_NAMESPACE)).toBe(true);
    console.log(`✓ Binding secret ${secretName} exists`);

    // Verify the secret exposes the expected connection fields
    const secretData = kubectl(
      `get secret ${secretName} -n ${TEST_NAMESPACE} -o jsonpath='{.data}'`,
    );
    const data = JSON.parse(secretData) as Record<string, string>;
    expect(data).toHaveProperty('uri');
    expect(data).toHaveProperty('host');
    expect(data).toHaveProperty('port');
    console.log('✓ Binding secret has expected keys: uri, host, port');
  });

  // ── Test: Create app with non-matching labels → verify it stays pending ──────

  test('non-matching labels - BrokerApp stays pending', async () => {
    const appName = 'e2e-app-nomatch';
    const brokerAppYaml = `
apiVersion: ${BROKERAPP_API}
kind: BrokerApp
metadata:
  name: ${appName}
  namespace: ${TEST_NAMESPACE}
spec:
  selector:
    matchLabels:
      tier: does-not-exist
  acceptor:
    port: 61616
  capabilities:
  - consumerOf:
    - address: "QUEUE.TEST"
`;
    applyYaml(brokerAppYaml);
    console.log(`✓ Applied BrokerApp ${appName} with non-matching selector`);

    // Give the operator enough time to reconcile
    console.log('Waiting 30s for operator to reconcile...');
    await sleep(30000);

    // Deployed condition must NOT be True
    const conditions = kubectl(
      `get brokerapp ${appName} -n ${TEST_NAMESPACE} -o jsonpath='{.status.conditions}'`,
      { ignoreError: true },
    );
    if (conditions) {
      const conditionsArray = JSON.parse(conditions) as Array<{ type: string; status: string }>;
      const deployed = conditionsArray.find((c) => c.type === 'Deployed');
      expect(deployed?.status).not.toBe('True');
      console.log('✓ Deployed condition is not True (BrokerApp is pending)');
    } else {
      // No conditions yet — operator has not bound it, which is the expected state
      console.log('✓ No conditions present — BrokerApp is still pending');
    }

    // No binding secret should have been created
    expect(secretExists(`${appName}-binding-secret`, TEST_NAMESPACE)).toBe(false);
    console.log('✓ No binding secret created for unbound BrokerApp');
  });
});

// ── UI form test: multiple Produces To addresses → verify CR spec ─────────────

test.describe('BrokerApp creation form', () => {
  const username = 'kubeadmin';
  const password = process.env.KUBEADMIN_PASSWORD || 'kubeadmin';
  const FORM_NAMESPACE = 'default';
  const APP_NAME = 'e2e-multi-addresses';

  // Clean up before each attempt (including retries) so AlreadyExists errors don't block the Create
  test.beforeEach(() => {
    kubectl(
      `delete brokerapps.broker.arkmq.org ${APP_NAME} -n ${FORM_NAMESPACE} --ignore-not-found=true`,
      { ignoreError: true },
    );
  });

  test.afterAll(() => {
    kubectl(
      `delete brokerapps.broker.arkmq.org ${APP_NAME} -n ${FORM_NAMESPACE} --ignore-not-found=true`,
      { ignoreError: true },
    );
  });

  // ── Test: Add multiple addresses to "Produces To" → verify all appear in spec ─

  test('multiple Produces To addresses all appear in spec', async ({ page }) => {
    await login(page, username, password);

    // Navigate to the create form
    await page.goto(`/k8s/ns/${FORM_NAMESPACE}/brokerapps/~new`, { waitUntil: 'load' });
    await page.waitForLoadState('domcontentloaded');

    // Verify the page title is rendered (form is ready)
    await expect(page.locator('h1[data-test="create-brokerapp-title"]')).toBeVisible({
      timeout: 30000,
    });

    // Fill required fields
    await page.locator('[data-test="brokerapp-name"]').fill(APP_NAME);

    // Fill at least one Service Selector label (required for Create to enable)
    await page.locator('[aria-label="Label key"]').first().fill('tier');
    await page.locator('[aria-label="Label value"]').first().fill('web');

    // Add three addresses to "Produces To"
    const producesInput = page.locator('#brokerapp-produces');
    const producesAddBtn = page
      .locator('.plugin__arkmq-org-broker-operator-openshift-ui__address-input-row')
      .filter({ has: producesInput })
      .locator('button');

    for (const address of ['QUEUE.A', 'QUEUE.B', 'QUEUE.C']) {
      await producesInput.fill(address);
      await producesAddBtn.click();
      // Verify the chip appeared before adding the next address
      await expect(page.locator('li').filter({ hasText: address })).toBeVisible({
        timeout: 5000,
      });
    }
    console.log('✓ Added three addresses to Produces To');

    // Intercept the k8sCreate POST request before clicking so we can inspect the response
    const createResponsePromise = page.waitForResponse(
      (resp) =>
        /\/brokerapps$/.test(resp.url()) && resp.request().method() === 'POST',
      { timeout: 30000 },
    );

    // Submit the form
    await page.locator('button:has-text("Create")').click();

    // Wait for the API response — a non-2xx here means k8sCreate threw and the form
    // shows an error instead of navigating, which would cause waitForURL to time out.
    const createResponse = await createResponsePromise;
    if (!createResponse.ok()) {
      const errorBody = await createResponse.text();
      throw new Error(
        `BrokerApp create API call failed (HTTP ${createResponse.status()}): ${errorBody}`,
      );
    }
    console.log(`✓ BrokerApp created via API (status: ${createResponse.status()})`);

    // Form redirects to the BrokerApps list on success.
    // Use a regex to avoid glob/encoding issues with the ~ character.
    await page.waitForURL(/broker\.arkmq\.org~v1beta2~BrokerApp/, { timeout: 15000 });
    console.log('✓ Redirected to BrokerApps list after creation');

    // Verify the created CR spec via kubectl (use fully-qualified resource to avoid resolving to the wrong API group)
    const producerOfJson = kubectl(
      `get brokerapps.broker.arkmq.org ${APP_NAME} -n ${FORM_NAMESPACE} -o jsonpath='{.spec.capabilities[0].producerOf}'`,
    );
    const producerOf = JSON.parse(producerOfJson) as Array<{ address: string }>;

    expect(producerOf).toHaveLength(3);
    expect(producerOf.map((p) => p.address)).toEqual(
      expect.arrayContaining(['QUEUE.A', 'QUEUE.B', 'QUEUE.C']),
    );
    console.log('✓ All three Produces To addresses are present in spec.capabilities[0].producerOf');
  });
});
