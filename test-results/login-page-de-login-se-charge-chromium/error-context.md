# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> page de login se charge
- Location: e2e\login.spec.ts:3:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('page de login se charge', async ({ page }) => {
> 4  |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  5  |   
  6  |   // Vérifier que le titre est présent
  7  |   await expect(page.locator('h1')).toContainText('BDB Consulting');
  8  |   
  9  |   // Vérifier que le formulaire est présent
  10 |   await expect(page.locator('input[type="email"]')).toBeVisible();
  11 |   await expect(page.locator('input[type="password"]')).toBeVisible();
  12 | });
```