// tests/e2e/projects.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Project Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as project manager
    await page.goto('/login');
    await page.fill('input[type="email"]', 'manager@demo.com');
    await page.fill('input[type="password"]', 'Manager123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should create a new project', async ({ page }) => {
    await page.click('text=Projects');
    await page.click('text=Create New Project');
    
    await page.fill('input[name="name"]', 'E2E Test Project');
    await page.fill('textarea[name="description"]', 'Created by Playwright E2E test');
    await page.click('button:has-text("Select deadline")');
    await page.click('button:has-text("15")'); // Select a date
    await page.click('button:has-text("Create Project")');
    
    await expect(page.locator('text=Project created successfully')).toBeVisible();
    await expect(page.locator('text=E2E Test Project')).toBeVisible();
  });
  
  test('should edit project details', async ({ page }) => {
    await page.click('text=Projects');
    
    // Find and click edit button on first project
    await page.locator('[data-testid="project-card"]:first-child [data-testid="edit-project"]').click();
    
    await page.fill('input[name="name"]', 'Updated Project Name');
    await page.fill('textarea[name="description"]', 'Updated description');
    await page.click('button:has-text("Update Project")');
    
    await expect(page.locator('text=Project updated successfully')).toBeVisible();
    await expect(page.locator('text=Updated Project Name')).toBeVisible();
  });
  
  test('should add member to project', async ({ page }) => {
    await page.click('text=Projects');
    await page.locator('[data-testid="project-card"]:first-child').click();
    await page.click('text=Team');
    await page.click('text=Invite Member');
    
    await page.fill('input[type="email"]', 'member@demo.com');
    await page.click('button:has-text("Send Invitation")');
    
    await expect(page.locator('text=Invitation sent')).toBeVisible();
  });
  
  test('should delete project', async ({ page }) => {
    await page.click('text=Projects');
    
    // Create a test project first
    await page.click('text=Create New Project');
    await page.fill('input[name="name"]', 'Project To Delete');
    await page.click('button:has-text("Select deadline")');
    await page.click('button:has-text("15")');
    await page.click('button:has-text("Create Project")');
    await page.waitForSelector('text=Project To Delete');
    
    // Delete the project
    await page.locator('[data-testid="project-card"]:has-text("Project To Delete") [data-testid="delete-project"]').click();
    await page.click('button:has-text("Confirm Delete")');
    
    await expect(page.locator('text=Project deleted successfully')).toBeVisible();
    await expect(page.locator('text=Project To Delete')).not.toBeVisible();
  });
  
  test('should view project details', async ({ page }) => {
    await page.click('text=Projects');
    await page.locator('[data-testid="project-card"]:first-child').click();
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Tasks')).toBeVisible();
    await expect(page.locator('text=Team')).toBeVisible();
    await expect(page.locator('text=Activity')).toBeVisible();
  });
  
  test('should filter projects by status', async ({ page }) => {
    await page.click('text=Projects');
    
    // Select status filter
    await page.selectOption('select[name="status"]', 'active');
    await page.click('button:has-text("Apply Filters")');
    
    // Verify all visible projects are active
    const projectCards = page.locator('[data-testid="project-card"]');
    const count = await projectCards.count();
    
    for (let i = 0; i < count; i++) {
      const status = await projectCards.nth(i).locator('[data-testid="project-status"]').innerText();
      expect(status.toLowerCase()).toBe('active');
    }
  });
});