import { test, expect, Page } from '@playwright/test';

test.describe('YouTube Reference Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to localhost:3000
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should successfully process YouTube Shorts URL and generate pitch', async ({ page }) => {
    // Mock successful YouTube processing to ensure test reliability
    await page.route('/api/process-youtube', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'test_result_shorts',
            source: {
              id: 'test_source',
              type: 'youtube',
              url: 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww',
              title: 'Test YouTube Shorts Video',
              description: 'A test shorts video for validation',
              duration: 30,
              thumbnail: 'https://test-thumbnail.jpg',
              transcript: 'Test transcript content for shorts video',
              processingStatus: 'completed',
              hasVideoAnalysis: true,
              videoAnalysisQuality: 'high'
            },
            extractedContent: {
              title: 'Test YouTube Shorts Video',
              description: 'A test shorts video for validation',
              transcript: 'Test transcript content for shorts video',
              keyTopics: ['測試', '短片', '內容'],
              sentiment: 'positive',
              duration: 30
            },
            generatedPitch: '這是一個測試的 YouTube Shorts 故事，展現了創新的短片內容創作方式，通過精彩的視覺效果和引人入勝的故事情節，在短短30秒內傳達了豐富的訊息和情感。',
            contentQuality: 'full',
            warning: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isStructuredOutput: true,
            structuredPitch: {
              title: '測試短片故事',
              characters: [{ name: '創作者', description: '充滿創意的內容創作者' }],
              scenes: [{ description: '開場吸引注意', duration: 10 }, { description: '核心內容展示', duration: 15 }, { description: '結尾呼籲行動', duration: 5 }],
              finalPitch: '這是一個測試的 YouTube Shorts 故事，展現了創新的短片內容創作方式，通過精彩的視覺效果和引人入勝的故事情節，在短短30秒內傳達了豐富的訊息和情感。',
              tags: ['測試', '短片', '內容']
            }
          }
        })
      });
    });

    const youtubeUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww';
    
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Ensure we're on the YouTube tab (should be default)
    const youtubeTab = page.getByRole('tab', { name: 'YouTube' });
    await youtubeTab.click();
    
    // Input the YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill(youtubeUrl);
    
    // Verify the Shorts detection indicator appears
    await expect(page.locator('text=YouTube Shorts').first()).toBeVisible({ timeout: 5000 });
    
    // Click the process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Wait for processing to start
    await expect(page.locator('text=Processing...')).toBeVisible({ timeout: 5000 });
    
    // Wait for processing to complete (with mocked response, should be faster)
    await expect(page.locator('text=Pitch Generated Successfully')).toBeVisible({ 
      timeout: 30000 // Reduced timeout since we're mocking
    });
    
    // Verify the pitch content is displayed
    const pitchContainer = page.locator('[class*="text-gray-800"]').first();
    await expect(pitchContainer).toBeVisible();
    
    // Verify pitch content matches our mocked response
    const pitchText = await pitchContainer.textContent();
    expect(pitchText).toBeTruthy();
    expect(pitchText!.length).toBeGreaterThan(50);
    expect(pitchText).toContain('YouTube Shorts 故事');
    
    // Verify source information is displayed
    await expect(page.locator('text=youtube')).toBeVisible();
    
    // Verify Shorts-specific features
    await expect(page.locator('text=Shorts Mode')).toBeVisible();
    await expect(page.locator('text=Shorts-Optimized Pitch')).toBeVisible();
    
    // Test the "Use This Pitch" button
    const useThisPitchButton = page.locator('button:has-text("Use This Pitch")');
    await expect(useThisPitchButton).toBeVisible();
    await useThisPitchButton.click();
    
    // Verify we can start over
    const startOverButton = page.locator('button:has-text("Start Over")');
    await expect(startOverButton).toBeVisible();
    
    console.log('✅ YouTube Shorts processing test passed successfully');
  });

  test('should handle invalid YouTube URL gracefully', async ({ page }) => {
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input an invalid URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill('https://invalid-url.com');
    
    // Click the process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Wait for error to appear
    await expect(page.locator('text="error", text="Error"').first()).toBeVisible({ 
      timeout: 30000 
    });
    
    console.log('✅ Invalid URL error handling test passed');
  });

  test('should show loading states during processing', async ({ page }) => {
    const youtubeUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww';
    
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input the YouTube URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill(youtubeUrl);
    
    // Click the process button
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Verify loading states
    await expect(page.locator('text=Processing...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[class*="animate-spin"]').first()).toBeVisible();
    
    // Verify progress bar appears
    await expect(page.locator('[role="progressbar"], .progress, [class*="progress"]')).toBeVisible({ timeout: 10000 });
    
    // Wait for completion
    await expect(page.locator('text=Pitch Generated Successfully')).toBeVisible({ 
      timeout: 60000 
    });
    
    console.log('✅ Loading states test passed');
  });

  test('should detect YouTube Shorts correctly', async ({ page }) => {
    const shortsUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww';
    
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input the YouTube Shorts URL
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill(shortsUrl);
    
    // Wait for Shorts detection
    await page.waitForTimeout(1000); // Allow time for detection to trigger
    
    // Verify Shorts detection indicator
    await expect(page.locator('text=YouTube Shorts').first()).toBeVisible({ timeout: 5000 });
    
    // Verify process button shows Shorts-specific text
    await expect(page.locator('button:has-text("Process YouTube Shorts")')).toBeVisible();
    
    console.log('✅ Shorts detection test passed');
  });

  test('should allow copying generated pitch to clipboard', async ({ page }) => {
    const youtubeUrl = 'https://youtube.com/shorts/AVPVDt6lXYw?si=U-JmrDgGRVOuY3Ww';
    
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Wait for the Reference tab content to load
    await page.waitForSelector('input[placeholder*="youtube.com"]', { timeout: 10000 });
    
    // Input the YouTube URL and process
    const urlInput = page.locator('input[placeholder*="youtube.com"]');
    await urlInput.fill(youtubeUrl);
    
    const processButton = page.locator('button:has-text("Process YouTube")');
    await processButton.click();
    
    // Wait for processing to complete
    await expect(page.locator('text=Pitch Generated Successfully')).toBeVisible({ 
      timeout: 60000 
    });
    
    // Find and click the copy button
    const copyButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await copyButton.click();
    
    console.log('✅ Copy to clipboard test passed');
  });
});

test.describe('Reference Tab Navigation', () => {
  test('should navigate between input types', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Navigate to Reference tab
    await page.click('text=Reference');
    
    // Test YouTube tab (should be default)
    await expect(page.locator('input[placeholder*="youtube.com"]')).toBeVisible();
    
    // Switch to Text tab
    await page.click('button:has-text("Text")');
    await expect(page.locator('textarea[placeholder*="Paste your"]')).toBeVisible();
    
    // Switch to Audio tab
    await page.click('button:has-text("Audio")');
    await expect(page.locator('text=Audio transcription coming soon')).toBeVisible();
    
    // Switch back to YouTube tab
    await page.click('button:has-text("YouTube")');
    await expect(page.locator('input[placeholder*="youtube.com"]')).toBeVisible();
    
    console.log('✅ Tab navigation test passed');
  });
});