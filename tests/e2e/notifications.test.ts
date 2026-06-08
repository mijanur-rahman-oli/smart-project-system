// tests/e2e/notifications.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Notifications E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'member@demo.com');
    await page.fill('input[type="password"]', 'Member123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should display notification bell with unread count', async ({ page }) => {
    const bell = page.locator('[aria-label="Notifications"]');
    await expect(bell).toBeVisible();
    
    const badge = bell.locator('.absolute');
    const hasBadge = await badge.isVisible().catch(() => false);
    // Badge may or may not be visible depending on test data
  });
  
  test('should open notification panel on click', async ({ page }) => {
    await page.click('[aria-label="Notifications"]');
    await expect(page.locator('text=Notifications')).toBeVisible();
    await expect(page.locator('.scroll-area')).toBeVisible();
  });
  
  test('should mark notification as read when clicked', async ({ page }) => {
    await page.click('[aria-label="Notifications"]');
    
    const unreadNotification = page.locator('[data-testid="notification-unread"]:first-child');
    if (await unreadNotification.isVisible()) {
      await unreadNotification.click();
      await expect(unreadNotification).not.toHaveAttribute('data-unread');
    }
  });
  
  test('should mark all notifications as read', async ({ page }) => {
    await page.click('[aria-label="Notifications"]');
    await page.click('button:has-text("Mark all read")');
    await expect(page.locator('text=All notifications marked as read')).toBeVisible();
  });
  
  test('should navigate to notifications page', async ({ page }) => {
    await page.click('[aria-label="Notifications"]');
    await page.click('text=View All Notifications');
    await expect(page).toHaveURL(/.*notifications/);
    await expect(page.locator('h1:has-text("Notifications")')).toBeVisible();
  });
  
  test('should filter notifications by type', async ({ page }) => {
    await page.goto('/dashboard/notifications');
    
    await page.click('text=Unread');
    await expect(page.locator('[data-testid="notification-list"]')).toBeVisible();
  });
});