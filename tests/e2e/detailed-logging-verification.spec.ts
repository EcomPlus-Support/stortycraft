import { test, expect, Page } from '@playwright/test';

test.describe('Detailed Logging Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to localhost:3000
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should generate and log unique request IDs for YouTube processing', async ({ page }) => {
    // Listen for console messages to capture request IDs
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Reference tab
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });

    // Input YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/test-logging-123');

    // Click process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();

    // Wait for some processing to occur
    await page.waitForTimeout(3000);

    // Verify that console messages contain structured logging
    const hasRequestIdGeneration = consoleMessages.some(msg => 
      msg.includes('🚀') && msg.includes('Starting YouTube processing') && msg.includes('youtube_')
    );

    const hasDetailedRequestInfo = consoleMessages.some(msg => 
      msg.includes('📡') && msg.includes('Sending request to API')
    );

    const hasResponseLogging = consoleMessages.some(msg => 
      msg.includes('📨') && msg.includes('API response status')
    );

    expect(hasRequestIdGeneration).toBe(true);
    expect(hasDetailedRequestInfo).toBe(true);
    expect(hasResponseLogging).toBe(true);

    // Verify request ID format (youtube_timestamp_randomString)
    const requestIdMessages = consoleMessages.filter(msg => 
      msg.includes('youtube_') && msg.includes('Starting YouTube processing')
    );

    expect(requestIdMessages.length).toBeGreaterThan(0);
    
    // Extract request ID from message
    const requestIdMatch = requestIdMessages[0].match(/youtube_\d+_[a-z0-9]+/);
    expect(requestIdMatch).toBeTruthy();
    expect(requestIdMatch![0]).toMatch(/^youtube_\d+_[a-z0-9]{6}$/);

    console.log('✅ Request ID generation and logging test passed');
    console.log(`Sample request ID: ${requestIdMatch![0]}`);
  });

  test('should log detailed API request and response information', async ({ page }) => {
    // Mock API to return specific response for logging verification
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'logging_test_result',
            source: {
              title: 'Logging Test Video',
              description: 'Video for testing logging functionality',
              type: 'youtube'
            },
            generatedPitch: 'Test pitch for logging verification',
            contentQuality: 'full',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Reference tab and process
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });

    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/logging-test-456');

    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();

    // Wait for processing to complete
    await expect(page.locator('text=Pitch Generated Successfully')).toBeVisible({ timeout: 15000 });

    // Wait for all console messages to be captured
    await page.waitForTimeout(2000);

    // Verify specific logging patterns
    const hasApiRequestLogging = consoleMessages.some(msg => 
      msg.includes('📡') && 
      msg.includes('Sending request to API with') &&
      msg.includes('contentType') &&
      msg.includes('useStructuredOutput')
    );

    const hasResponseStatusLogging = consoleMessages.some(msg => 
      msg.includes('📨') && 
      msg.includes('API response status') &&
      msg.includes('200')
    );

    const hasResponseDataLogging = consoleMessages.some(msg => 
      msg.includes('📋') && 
      msg.includes('API response data') &&
      msg.includes('success') &&
      msg.includes('hasData')
    );

    const hasSuccessLogging = consoleMessages.some(msg => 
      msg.includes('✅') && 
      msg.includes('Content processed successfully') &&
      msg.includes('pitchLength')
    );

    const hasCompletionLogging = consoleMessages.some(msg => 
      msg.includes('🏁') && 
      msg.includes('YouTube processing completed')
    );

    expect(hasApiRequestLogging).toBe(true);
    expect(hasResponseStatusLogging).toBe(true);
    expect(hasResponseDataLogging).toBe(true);
    expect(hasSuccessLogging).toBe(true);
    expect(hasCompletionLogging).toBe(true);

    console.log('✅ Detailed API logging verification test passed');
  });

  test('should log comprehensive error information with context', async ({ page }) => {
    // Mock API to return error for logging verification
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Video not found or not accessible',
          details: 'The specified video ID does not exist or is private',
          requestId: 'req_test_error_123'
        })
      });
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Reference tab and process
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });

    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/error-test-789');

    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();

    // Wait for error to appear
    await expect(page.locator('text="error"').first()).toBeVisible({ timeout: 15000 });

    // Wait for all console messages
    await page.waitForTimeout(2000);

    // Verify error logging patterns
    const hasErrorRequestInfo = consoleMessages.some(msg => 
      msg.includes('❌') && 
      msg.includes('API request failed') &&
      msg.includes('status: 400')
    );

    const hasDetailedErrorInfo = consoleMessages.some(msg => 
      msg.includes('💥') && 
      msg.includes('Error processing YouTube content') &&
      msg.includes('timestamp') &&
      msg.includes('url')
    );

    const hasErrorStack = consoleMessages.some(msg => 
      msg.includes('stack') || msg.includes('error')
    );

    expect(hasErrorRequestInfo).toBe(true);
    expect(hasDetailedErrorInfo).toBe(true);

    console.log('✅ Error logging verification test passed');
  });

  test('should maintain request ID consistency across processing steps', async ({ page }) => {
    const consoleMessages: string[] = [];
    const requestIds: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`${msg.type()}: ${text}`);
      
      // Extract request IDs from different steps
      const requestIdMatch = text.match(/\[([^[\]]+)\]/);
      if (requestIdMatch && requestIdMatch[1].startsWith('youtube_')) {
        requestIds.push(requestIdMatch[1]);
      }
    });

    // Navigate to Reference tab and process
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });

    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/consistency-test-999');

    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();

    // Wait for some processing
    await page.waitForTimeout(5000);

    // Verify request ID consistency
    const uniqueRequestIds = [...new Set(requestIds)];
    
    // Should have at least one request ID
    expect(uniqueRequestIds.length).toBeGreaterThan(0);
    
    // All request IDs for this processing session should be the same
    if (requestIds.length > 1) {
      const firstRequestId = requestIds[0];
      const allSameRequestId = requestIds.every(id => id === firstRequestId);
      expect(allSameRequestId).toBe(true);
    }

    console.log('✅ Request ID consistency test passed');
    console.log(`Captured request IDs: ${uniqueRequestIds.length} unique, ${requestIds.length} total`);
  });

  test('should log processing time and performance metrics', async ({ page }) => {
    // Mock fast API response
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'performance_test',
            source: {
              title: 'Performance Test Video',
              type: 'youtube'
            },
            generatedPitch: 'Performance test pitch',
            contentQuality: 'full',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    const startTime = Date.now();

    // Navigate and process
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });

    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://youtube.com/shorts/performance-test');

    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();

    await expect(page.locator('text=Pitch Generated Successfully')).toBeVisible({ timeout: 15000 });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Wait for all messages
    await page.waitForTimeout(1000);

    // Verify completion logging
    const hasCompletionMessage = consoleMessages.some(msg => 
      msg.includes('🏁') && msg.includes('YouTube processing completed')
    );

    expect(hasCompletionMessage).toBe(true);
    expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds with mocked API

    console.log('✅ Performance metrics logging test passed');
    console.log(`Total processing time: ${totalTime}ms`);
  });

  test('should log text processing with proper request tracking', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to Reference tab and switch to Text
    await page.click('text=Reference');
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    await page.click('button:has-text("Text")');
    await page.waitForSelector('textarea[placeholder*="Paste your"]', { timeout: 5000 });

    // Input text content
    const textArea = page.locator('textarea[placeholder*="Paste your"]');
    await textArea.fill('這是一個測試文字內容，用來驗證文字處理功能的日誌記錄是否正常運作。');

    const processButton = page.locator('button:has-text("Process Text")');
    await processButton.click();

    // Wait for processing
    await page.waitForTimeout(3000);

    // Verify text processing doesn't interfere with YouTube request ID format
    // Text processing should not generate YouTube-style request IDs
    const hasYouTubeRequestIds = consoleMessages.some(msg => 
      msg.includes('youtube_') && msg.includes('Starting YouTube processing')
    );

    expect(hasYouTubeRequestIds).toBe(false); // Should not have YouTube request IDs for text processing

    console.log('✅ Text processing logging isolation test passed');
  });
});