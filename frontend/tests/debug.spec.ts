import { test, expect } from '@playwright/test';

test('debug production domain', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('Navigating to production...');
  await page.goto('/');
  console.log('Current URL:', page.url());

  // Wait 5 seconds
  await page.waitForTimeout(5000);
  console.log('URL after wait:', page.url());

  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  console.log('Body HTML preview:', bodyHtml.substring(0, 1000));
});
