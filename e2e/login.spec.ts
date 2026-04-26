import { test, expect } from '@playwright/test';

test('page de login se charge', async ({ page }) => {
  await page.goto('/login');
  
  // Vérifier que le titre est présent
  await expect(page.locator('h1')).toContainText('BDB Consulting');
  
  // Vérifier que le formulaire est présent
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});