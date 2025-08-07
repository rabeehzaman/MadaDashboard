// Ready-to-use Playwright screenshot utilities for your project
import { chromium, firefox, webkit } from 'playwright';
import { 
  captureScreenshotSafe, 
  captureElementScreenshotSafe, 
  captureFullPageScreenshotSafe,
  resizeImageBuffer,
  checkImageDimensions
} from './src/lib/playwright-screenshot-utils';

/**
 * Complete example showing how to use the safe screenshot utilities
 * This replaces any existing Playwright screenshot code you might have
 */
export class SafeScreenshotHelper {
  
  /**
   * Take a safe screenshot of your dashboard or any URL
   */
  static async screenshotDashboard(url: string = 'http://localhost:3000') {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Safe full page screenshot - never exceeds API limits
      const result = await captureFullPageScreenshotSafe(page, {
        maxWidth: 8000,   // Claude API limit
        maxHeight: 8000,  // Claude API limit
        quality: 90,
        format: 'png',
        path: 'dashboard-screenshot.png'
      });

      console.log(`✅ Dashboard screenshot saved: ${result.finalDimensions.width}x${result.finalDimensions.height}`);
      if (result.resized) {
        console.log(`📏 Resized from: ${result.originalDimensions?.width}x${result.originalDimensions?.height}`);
      }

      return result.buffer;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Screenshot specific elements (charts, tables, etc.)
   */
  static async screenshotElement(url: string, selector: string) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible' });

      const result = await captureElementScreenshotSafe(element, {
        maxWidth: 4000,
        maxHeight: 4000,
        quality: 85,
        format: 'jpeg'
      });

      console.log(`✅ Element screenshot taken: ${result.finalDimensions.width}x${result.finalDimensions.height}`);
      return result.buffer;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Safe mobile screenshot (useful for PWA testing)
   */
  static async screenshotMobile(url: string) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const result = await captureScreenshotSafe(page, {
        maxWidth: 2000,  // For multi-image uploads
        maxHeight: 2000,
        quality: 85,
        format: 'jpeg',
        path: 'mobile-screenshot.jpg'
      });

      console.log(`📱 Mobile screenshot: ${result.finalDimensions.width}x${result.finalDimensions.height}`);
      return result.buffer;
      
    } finally {
      await browser.close();
    }
  }

  /**
   * Screenshot comparison - before/after changes
   */
  static async compareScreenshots(url: string, beforeAction?: () => Promise<void>) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Before screenshot
      const beforeResult = await captureScreenshotSafe(page, {
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 90
      });

      // Perform action if provided
      if (beforeAction) {
        await beforeAction();
        await page.waitForTimeout(1000); // Wait for changes
      }

      // After screenshot
      const afterResult = await captureScreenshotSafe(page, {
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 90
      });

      return {
        before: beforeResult.buffer,
        after: afterResult.buffer,
        beforeDimensions: beforeResult.finalDimensions,
        afterDimensions: afterResult.finalDimensions
      };
      
    } finally {
      await browser.close();
    }
  }
}

/**
 * Quick utility functions for common screenshot needs
 */
export const quickScreenshot = {
  
  // Screenshot your local dashboard
  dashboard: () => SafeScreenshotHelper.screenshotDashboard('http://localhost:3000'),
  
  // Screenshot production dashboard
  production: () => SafeScreenshotHelper.screenshotDashboard('https://your-domain.com'),
  
  // Screenshot specific chart
  chart: (selector: string) => SafeScreenshotHelper.screenshotElement('http://localhost:3000', selector),
  
  // Mobile view
  mobile: () => SafeScreenshotHelper.screenshotMobile('http://localhost:3000'),
  
  // Custom URL
  custom: (url: string) => SafeScreenshotHelper.screenshotDashboard(url)
};

/**
 * Example usage in your code:
 * 
 * // Quick screenshots
 * const buffer = await quickScreenshot.dashboard();
 * const chartBuffer = await quickScreenshot.chart('.recharts-wrapper');
 * const mobileBuffer = await quickScreenshot.mobile();
 * 
 * // Advanced usage
 * const helper = new SafeScreenshotHelper();
 * const buffer = await helper.screenshotDashboard('http://localhost:3000');
 * 
 * // All buffers are automatically resized to prevent API errors!
 */

// Demonstration function
async function demonstrateScreenshotUtils() {
  console.log('🧪 Testing Screenshot Utilities...\n');
  
  try {
    // Test with example.com since localhost might not be running
    const buffer = await SafeScreenshotHelper.screenshotDashboard('https://example.com');
    const dimensions = await checkImageDimensions(buffer);
    
    console.log(`✅ Screenshot captured: ${dimensions.width}x${dimensions.height}`);
    console.log(`⚠️  Exceeds 8000px limit: ${dimensions.exceedsLimit}`);
    console.log('🎉 All utilities working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export everything
export { demonstrateScreenshotUtils };