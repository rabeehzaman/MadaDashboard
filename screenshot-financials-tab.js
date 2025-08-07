#!/usr/bin/env node

/**
 * Script to screenshot the financials tab safely
 * Usage: node screenshot-financials-tab.js
 */

const { chromium } = require('playwright');
const sharp = require('sharp');

// Inline safe screenshot function
async function captureScreenshotSafe(page, options = {}) {
  const {
    maxWidth = 8000,
    maxHeight = 8000,
    quality = 90,
    format = 'png',
    path,
    ...playwrightOptions
  } = options;

  const buffer = await page.screenshot({
    ...playwrightOptions,
    type: format
  });

  const sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const originalDimensions = { width: metadata.width, height: metadata.height };

  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    const ratio = Math.min(maxWidth / metadata.width, maxHeight / metadata.height);
    const newWidth = Math.floor(metadata.width * ratio);
    const newHeight = Math.floor(metadata.height * ratio);

    const processedBuffer = await sharpInstance
      .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
      .toFormat(format, { quality })
      .toBuffer();

    if (path) await sharp(processedBuffer).toFile(path);

    return {
      buffer: processedBuffer,
      resized: true,
      originalDimensions,
      finalDimensions: { width: newWidth, height: newHeight }
    };
  }

  let finalBuffer = buffer;
  if (format === 'jpeg') {
    finalBuffer = await sharpInstance.toFormat('jpeg', { quality }).toBuffer();
  }

  if (path) await sharp(finalBuffer).toFile(path);

  return {
    buffer: finalBuffer,
    resized: false,
    finalDimensions: originalDimensions
  };
}

async function screenshotFinancialsTab() {
  console.log('📸 Taking screenshot of Financials tab...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Set reasonable viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Try different ports where Next.js might be running
    const ports = [3002, 3000, 3001];
    let dashboardUrl = '';
    let connected = false;
    
    for (const port of ports) {
      const url = `http://localhost:${port}`;
      try {
        console.log(`🔗 Trying ${url}...`);
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        dashboardUrl = url;
        connected = true;
        console.log(`✅ Connected to ${url}`);
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}: ${error.message}`);
      }
    }
    
    if (!connected) {
      throw new Error('Could not connect to any local development server. Make sure your dashboard is running.');
    }
    
    console.log('🏠 Dashboard loaded, navigating to financials...');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Try to navigate to financials page
    const financialsUrl = `${dashboardUrl}/financials`;
    console.log(`🔗 Navigating to ${financialsUrl}...`);
    
    await page.goto(financialsUrl, { timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    console.log('💰 Financials page loaded, waiting for content...');
    
    // Wait for any loading states to complete
    await page.waitForTimeout(5000);
    
    // Check if there are any loading indicators and wait for them
    try {
      await page.waitForSelector('[data-testid="loading"]', { state: 'detached', timeout: 5000 });
    } catch (e) {
      // Loading indicator might not exist, that's fine
    }
    
    // Try to wait for some financial content to appear
    try {
      await page.waitForSelector('.grid, [data-testid="financial"]', { timeout: 10000 });
      console.log('📊 Financial content detected');
    } catch (e) {
      console.log('⚠️  No specific financial content detected, proceeding with screenshot');
    }
    
    // Take safe full page screenshot
    console.log('📸 Capturing screenshot...');
    const result = await captureScreenshotSafe(page, {
      maxWidth: 8000,    // Claude API limit
      maxHeight: 8000,   // Claude API limit
      quality: 90,
      format: 'png',
      path: 'financials-tab-screenshot.png',
      fullPage: true
    });
    
    console.log(`\n📊 Financials Tab Screenshot Results:`);
    console.log(`   📏 Dimensions: ${result.finalDimensions.width}x${result.finalDimensions.height}`);
    console.log(`   📦 Resized: ${result.resized ? 'Yes' : 'No'}`);
    
    if (result.resized && result.originalDimensions) {
      console.log(`   📐 Original: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    }
    
    console.log(`   💾 Saved: financials-tab-screenshot.png`);
    console.log(`   🔗 URL: ${financialsUrl}`);
    
    // Also create a smaller version for API uploads
    const smallResult = await captureScreenshotSafe(page, {
      maxWidth: 2000,    // For multi-image uploads
      maxHeight: 2000,
      quality: 85,
      format: 'jpeg',
      path: 'financials-tab-api-ready.jpg',
      fullPage: true
    });
    
    console.log(`\n📱 API-Ready Version:`);
    console.log(`   📏 Dimensions: ${smallResult.finalDimensions.width}x${smallResult.finalDimensions.height}`);
    console.log(`   💾 Saved: financials-tab-api-ready.jpg`);
    
    console.log(`\n🎉 Financials tab screenshots completed successfully!`);
    console.log(`\n💡 Files created:`);
    console.log(`   - financials-tab-screenshot.png (high quality)`);
    console.log(`   - financials-tab-api-ready.jpg (API upload ready)`);
    console.log(`   - Both guaranteed under API size limits!`);
    
    // Keep browser open for a moment to see the result
    console.log(`\n⏱️  Keeping browser open for 5 seconds...`);
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   - Make sure your dashboard is running (npm run dev)');
    console.log('   - Check if the financials page loads manually in your browser');
    console.log('   - Verify the financials route exists at /financials');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the screenshot function
screenshotFinancialsTab().catch(console.error);