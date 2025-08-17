import { test, expect, Page } from '@playwright/test';

test.describe('Error Handling and Logging', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to localhost:3000
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display user-friendly error messages for invalid YouTube URLs', async ({ page }) => {
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Test various invalid URL formats
    const invalidUrls = [
      'https://invalid-url.com',
      'not-a-url-at-all',
      'https://youtube.com/invalid',
      'https://vimeo.com/123456789'  // Different video platform
    ];

    for (const invalidUrl of invalidUrls) {
      console.log(`Testing invalid URL: ${invalidUrl}`);
      
      // Clear and input the invalid URL
      const urlInput = page.locator('input[placeholder*="youtube.com"]');
      await urlInput.fill('');
      await urlInput.fill(invalidUrl);
      
      // Click the process button
      const processButton = page.locator('button:has-text("Process YouTube")');
      await processButton.click();
      
      // Wait for error to appear (should show user-friendly error)
      await expect(page.locator('text="error", text="Error"').first()).toBeVisible({ 
        timeout: 30000 
      });
      
      // Check for specific user-friendly error messages
      const errorContent = page.locator('text="error", text="Error"').first();
      const errorText = await errorContent.textContent();
      
      // Should not show technical error messages
      expect(errorText).not.toContain('undefined');
      expect(errorText).not.toContain('null');
      expect(errorText).not.toContain('stack trace');
      expect(errorText).not.toContain('TypeError');
      
      // Reset for next iteration
      await page.click('button:has-text("Start Over"), button:has-text("Try Again"), button:has-text("Reset")');
      await page.waitForTimeout(1000);
    }
    
    console.log('✅ Invalid URL error handling test passed');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure by intercepting the API call
    await page.route('/api/process-youtube', (route) => {
      route.abort('failed');
    });

    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input a valid YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/AVPVDt6lXYw');
    
    // Click the process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Should show network error message
    await expect(page.locator('text="network"').or(page.locator('text="connection"')).or(page.locator('text="failed"')).or(page.locator('text="error"')).first()).toBeVisible({ 
      timeout: 15000 
    });
    
    console.log('✅ Network error handling test passed');
  });

  test('should show appropriate loading states and timeout handling', async ({ page }) => {
    // Mock a slow API response
    await page.route('/api/process-youtube', async (route) => {
      // Delay the response to test loading states
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'test_result',
            source: {
              title: 'Test Video',
              description: 'Test description',
              type: 'youtube'
            },
            generatedPitch: 'Test pitch content',
            contentQuality: 'full',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Navigate to Reference tab
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/AVPVDt6lXYw');
    
    // Click process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Verify loading indicators appear
    await expect(page.locator('text=Processing...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[class*="animate-spin"]').first()).toBeVisible();
    
    // Verify progress indicators
    await expect(page.locator('[role="progressbar"], .progress, [class*="progress"]')).toBeVisible({ timeout: 5000 });
    
    // Wait for completion
    await expect(page.locator('text=Pitch Generated Successfully').or(page.locator('text=Test pitch content')).first()).toBeVisible({ 
      timeout: 15000 
    });
    
    console.log('✅ Loading states and timeout handling test passed');
  });

  test('should log detailed error information in console', async ({ page }) => {
    // Listen for console messages to verify logging
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Reference tab
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input an invalid URL that will cause logging
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/nonexistent-video-id-12345');
    
    // Click process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Wait for processing to complete (with error)
    await expect(page.locator('text="error"').or(page.locator('text="Error"')).first()).toBeVisible({ 
      timeout: 30000 
    });
    
    // Verify console logging occurred
    await page.waitForTimeout(2000); // Allow time for console messages
    
    // Check that we have console messages with proper formatting
    const hasRequestIdLogs = consoleMessages.some(msg => 
      msg.includes('🚀') && msg.includes('Starting YouTube processing')
    );
    const hasErrorLogs = consoleMessages.some(msg => 
      msg.includes('💥') || msg.includes('❌') || msg.includes('Error processing YouTube content')
    );
    
    expect(hasRequestIdLogs).toBe(true);
    expect(hasErrorLogs).toBe(true);
    
    console.log('✅ Console logging test passed');
    console.log('Sample console messages:', consoleMessages.slice(0, 5));
  });

  test('should handle text processing errors gracefully', async ({ page }) => {
    // Navigate to Reference tab
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Switch to Text tab
    await page.click('button:has-text("Text")');
    await page.waitForSelector('textarea[placeholder*="Paste your"]', { timeout: 5000 });
    
    // Test with empty text
    const textArea = page.locator('textarea[placeholder*="Paste your"]');
    await textArea.fill('');
    
    const processButton = page.locator('button:has-text("Process Text")');
    await processButton.click();
    
    // Should show validation error for empty text
    await expect(page.locator('text="content"').or(page.locator('text="required"')).or(page.locator('text="empty"')).first()).toBeVisible({ 
      timeout: 10000 
    });
    
    // Test with very short text
    await textArea.fill('Hi');
    await processButton.click();
    
    // Should show validation error for short text
    await expect(page.locator('text="least"').or(page.locator('text="characters"')).or(page.locator('text="short"')).first()).toBeVisible({ 
      timeout: 10000 
    });
    
    console.log('✅ Text processing error handling test passed');
  });

  test('should recover from errors and allow retry', async ({ page }) => {
    // First, simulate an error condition
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Service temporarily unavailable',
          details: 'Please try again later'
        })
      });
    });

    // Navigate to Reference tab
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/AVPVDt6lXYw');
    
    // Process and get error
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Wait for error
    await expect(page.locator('text="error"').first()).toBeVisible({ timeout: 15000 });
    
    // Now remove the route to simulate service recovery
    await page.unroute('/api/process-youtube');
    
    // Mock successful response
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'recovery_test',
            source: {
              title: 'Recovery Test Video',
              description: 'Test after error recovery',
              type: 'youtube'
            },
            generatedPitch: 'Successfully recovered and generated pitch',
            contentQuality: 'full',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });
    
    // Click retry button
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    } else {
      // If no retry button, click process again
      await processButton.click();
    }
    
    // Should now succeed
    await expect(page.locator('text=Pitch Generated Successfully').or(page.locator('text=Successfully recovered')).first()).toBeVisible({ 
      timeout: 15000 
    });
    
    console.log('✅ Error recovery and retry test passed');
  });
});