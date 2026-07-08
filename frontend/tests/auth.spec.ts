import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page by default', async ({ page }) => {
    // Go to the base URL
    await page.goto('/');

    // Check that we see the welcome message
    await expect(page.locator('h2')).toContainText('Welcome Back');
    await expect(page.locator('p')).toContainText('Consolidate your multi-channel seller metrics');

    // Check that email and password fields are present
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check button exists
    const signInButton = page.locator('button[type="submit"]');
    await expect(signInButton).toContainText('Sign In');
  });

  test('should navigate to sign up page and back to login page', async ({ page }) => {
    await page.goto('/');

    // Click "Create Store" button to toggle to Signup view
    const createStoreButton = page.getByRole('button', { name: 'Create Store' });
    await createStoreButton.click();

    // Verify signup page is displayed
    await expect(page.locator('h2')).toContainText('Create Store');
    await expect(page.locator('p')).toContainText('Get started with unified e-commerce bookkeeping');

    // Verify signup form inputs
    await expect(page.getByPlaceholder('Rahul', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Rahul Store', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('email@store.com', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Min. 6 characters', { exact: true })).toBeVisible();

    // Click "Sign In" button in footer to toggle back to Login view
    const signInFooterButton = page.getByRole('button', { name: 'Sign In' });
    await signInFooterButton.click();

    // Verify we are back on login page
    await expect(page.locator('h2')).toContainText('Welcome Back');
  });

  test('should show validation or API errors on invalid login attempt', async ({ page }) => {
    await page.goto('/');

    // Fill in credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Click submit
    await page.click('button[type="submit"]');

    // It should display an error alert since credentials don't exist
    const errorAlert = page.locator('div.bg-red-500\\/10');
    await expect(errorAlert).toBeVisible({ timeout: 60000 });
    await expect(errorAlert).toHaveText(/Invalid email or password|Failed to log in/i);
  });
});
