import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

const username = 'kubeadmin';
const password = process.env.KUBEADMIN_PASSWORD || 'kubeadmin';

test.describe('Console login smoke', () => {
  test('logs in and lands on console', async ({ page }) => {
    await login(page, username, password);
    await expect(page).toHaveURL(/localhost/, { timeout: 30000 });
  });
});
