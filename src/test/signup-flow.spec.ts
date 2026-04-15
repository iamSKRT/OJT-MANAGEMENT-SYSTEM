import { test, expect } from '@playwright/test';

test.describe('Signup with custom hours flow', () => {
  test('Signup with custom hours (200) → Verify redirect to login → hours show on dashboard after manual login', async ({ page }) => {
    // Use unique email for each run
    const testEmail = `test-playwright-${Date.now()}@example.com`;
    const testPassword = 'Testpass1!';
    const testName = 'Test Playwright User';
    const testHours = '200';

    // 1. Navigate to app root (shows Auth since not logged in)
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    // Verify initially on login view
    await expect(page.getByText('Welcome back')).toBeVisible();
    await expect(page.getByText('Sign In')).toBeVisible();

    // 2. Switch to signup tab
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByText('Create account')).toBeVisible();
    await expect(page.getByPlaceholder('Full Name')).toBeVisible();
    await expect(page.getByPlaceholder('Total OJT hours required')).toBeVisible();

    // 3. Fill signup form
    await page.fill('[placeholder="Full Name"]', testName);
    await page.fill('[placeholder="Total OJT hours required"]', testHours);
    await page.fill('[placeholder="Email address"]', testEmail);
    await page.fill('[placeholder="Password"]', testPassword);

    // 4. Submit signup
    await page.click('button:has-text("Create Account")');
    await expect(page.getByText('Account created & logged in successfully!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Total hours set to 200/)).toBeVisible({ timeout: 3000 });

    // Verify leaves signup mode (no signup fields)
    await expect(page.getByPlaceholder('Full Name')).not.toBeVisible();

// 5. Auto-login → dashboard loads directly (no manual login needed)
    // Wait for dashboard to load (StudentDashboard stats)
    await expect(page.getByText('Weekly Total')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[class*="OJT Tracker"]')).toBeVisible();

    // 6. Verify hours show: hoursLeft should be 200h (no reports yet, totalCompleted=0)
    const hoursLeftLocator = page.getByRole('img', { name: 'Timer' }).locator('..').getByText(/200h/);
    await expect(hoursLeftLocator).toBeVisible({ timeout: 5000 });

    // Verify progress 0% initially
    await expect(page.locator('[style*="width: 0%"], [style*="width: 0"], [style*="width: 0px"]')).toBeVisible();

    // 7. Test explicit reload keeps dashboard with hours
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.getByText('Weekly Total')).toBeVisible();
    await expect(hoursLeftLocator).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });
});

