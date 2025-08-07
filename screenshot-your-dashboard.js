#!/usr/bin/env node

/**
 * Simple script to screenshot your dashboard safely
 * Usage: node screenshot-your-dashboard.js
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

async function screenshotDashboard() {
  console.log('📸 Taking safe screenshot of your dashboard...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Try localhost first, fallback to example.com for demo
    const urls = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://example.com'
    ];
    
    let currentUrl = '';
    let connected = false;
    
    for (const url of urls) {
      try {
        console.log(`🔗 Trying ${url}...`);
        await page.goto(url, { timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        currentUrl = url;
        connected = true;
        console.log(`✅ Connected to ${url}`);
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}`);
      }
    }
    
    if (!connected) {
      throw new Error('Could not connect to any URL');
    }
    
    // Set reasonable viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Take safe full page screenshot
    const result = await captureScreenshotSafe(page, {
      maxWidth: 8000,    // Claude API limit
      maxHeight: 8000,   // Claude API limit
      quality: 90,
      format: 'png',
      path: 'dashboard-safe-screenshot.png',
      fullPage: true
    });
    
    console.log(`\n📊 Screenshot Results:`);
    console.log(`   📏 Dimensions: ${result.finalDimensions.width}x${result.finalDimensions.height}`);
    console.log(`   📦 Resized: ${result.resized ? 'Yes' : 'No'}`);
    
    if (result.resized && result.originalDimensions) {
      console.log(`   📐 Original: ${result.originalDimensions.width}x${result.originalDimensions.height}`);
    }
    
    console.log(`   💾 Saved: dashboard-safe-screenshot.png`);
    console.log(`   🔗 URL: ${currentUrl}`);
    
    // Also create a smaller version for API uploads
    const smallResult = await captureScreenshotSafe(page, {
      maxWidth: 2000,    // For multi-image uploads
      maxHeight: 2000,
      quality: 85,
      format: 'jpeg',
      path: 'dashboard-api-ready.jpg',
      fullPage: true
    });
    
    console.log(`\n📱 API-Ready Version:`);
    console.log(`   📏 Dimensions: ${smallResult.finalDimensions.width}x${smallResult.finalDimensions.height}`);
    console.log(`   💾 Saved: dashboard-api-ready.jpg`);
    
    console.log(`\n🎉 Screenshots completed successfully!`);
    console.log(`\n💡 Usage Tips:`);
    console.log(`   - Use dashboard-safe-screenshot.png for high quality viewing`);
    console.log(`   - Use dashboard-api-ready.jpg for Claude API uploads`);
    console.log(`   - Both files are guaranteed to be under API size limits!`);
    
  } catch (error) {
    console.error('❌ Screenshot failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the screenshot function
screenshotDashboard().catch(console.error);