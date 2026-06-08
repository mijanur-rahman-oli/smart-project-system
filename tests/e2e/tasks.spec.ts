// tests/e2e/tasks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Task Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'manager@demo.com');
    await page.fill('input[type="password"]', 'Manager123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new task', async ({ page }) => {
    await page.click('text=Tasks');
    await page.click('text=Create Task');
    
    await page.selectOption('select[name="projectId"]', { index: 1 });
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.fill('textarea[name="description"]', 'Created by Playwright E2E');
    await page.click('button:has-text("Select due date")');
    await page.click('button:has-text("15")');
    await page.click('button:has-text("Create Task")');
    
    await expect(page.locator('text=Task created successfully')).toBeVisible();
    await expect(page.locator('text=E2E Test Task')).toBeVisible();
  });
  
  test('should drag and drop task between columns', async ({ page }) => {
    await page.click('text=Tasks');
    
    const taskCard = page.locator('[data-testid="task-card"]:first-child');
    const inProgressColumn = page.locator('[data-testid="column-in_progress"]');
    
    await taskCard.dragTo(inProgressColumn);
    await expect(page.locator('text=Task status updated')).toBeVisible();
  });
  
  test('should edit task details', async ({ page }) => {
    await page.click('text=Tasks');
    await page.locator('[data-testid="task-card"]:first-child').click();
    await page.click('text=Edit');
    
    await page.fill('input[name="title"]', 'Updated Task Title');
    await page.click('button:has-text("Save Changes")');
    
    await expect(page.locator('text=Task updated successfully')).toBeVisible();
    await expect(page.locator('text=Updated Task Title')).toBeVisible();
  });
  
  test('should assign task to team member', async ({ page }) => {
    await page.click('text=Tasks');
    await page.locator('[data-testid="task-card"]:first-child').click();
    await page.click('text=Assign');
    await page.selectOption('select[name="assignee"]', { index: 1 });
    await page.click('button:has-text("Assign")');
    
    await expect(page.locator('text=Task assigned successfully')).toBeVisible();
  });
  
  test('should add comment to task', async ({ page }) => {
    await page.click('text=Tasks');
    await page.locator('[data-testid="task-card"]:first-child').click();
    await page.click('text=Comments');
    
    await page.fill('textarea[placeholder="Write a comment..."]', 'Test comment from E2E');
    await page.click('button:has-text("Post Comment")');
    
    await expect(page.locator('text=Test comment from E2E')).toBeVisible();
  });
  
  test('should filter tasks by status', async ({ page }) => {
    await page.click('text=Tasks');
    
    await page.selectOption('select[name="status"]', 'completed');
    await page.click('button:has-text("Apply Filters")');
    
    const taskCards = page.locator('[data-testid="task-card"]');
    const count = await taskCards.count();
    
    for (let i = 0; i < count; i++) {
      const status = await taskCards.nth(i).locator('[data-testid="task-status"]').innerText();
      expect(status.toLowerCase()).toBe('completed');
    }
  });
  
  test('should search tasks', async ({ page }) => {
    await page.click('text=Tasks');
    
    await page.fill('input[placeholder="Search tasks..."]', 'E2E Test Task');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=E2E Test Task')).toBeVisible();
  });
});