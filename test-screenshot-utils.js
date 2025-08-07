const { chromium } = require('playwright');
const sharp = require('sharp');

// Inline the utility functions for testing
async function captureScreenshotSafe(page, options = {}) {
  const {
    maxWidth = 8000,
    maxHeight = 8000,
    quality = 90,
    format = 'png',
    playwrightOptions = {}
  } = options;

  const buffer = await page.screenshot({
    ...playwrightOptions,
    type: format
  });

  return processScreenshotBuffer(buffer, {
    maxWidth,
    maxHeight,
    quality,
    format
  });
}

async function processScreenshotBuffer(buffer, options) {
  const { maxWidth, maxHeight, quality, format } = options;

  const sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  const originalDimensions = {
    width: metadata.width,
    height: metadata.height
  };

  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    const ratio = Math.min(maxWidth / metadata.width, maxHeight / metadata.height);
    const newWidth = Math.floor(metadata.width * ratio);
    const newHeight = Math.floor(metadata.height * ratio);

    const processedBuffer = await sharpInstance
      .resize(newWidth, newHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat(format, { quality })
      .toBuffer();

    return {
      buffer: processedBuffer,
      resized: true,
      originalDimensions,
      finalDimensions: { width: newWidth, height: newHeight }
    };
  }

  let finalBuffer = buffer;
  if (format === 'jpeg') {
    finalBuffer = await sharpInstance
      .toFormat('jpeg', { quality })
      .toBuffer();
  }

  return {
    buffer: finalBuffer,
    resized: false,
    finalDimensions: originalDimensions
  };
}

async function captureFullPageScreenshotSafe(page, options = {}) {
  const currentViewport = page.viewportSize();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    const result = await captureScreenshotSafe(page, {
      ...options,
      playwrightOptions: {
        ...options.playwrightOptions,
        fullPage: true
      }
    });

    if (currentViewport) {
      await page.setViewportSize(currentViewport);
    }

    return result;
  } catch (error) {
    if (currentViewport) {
      await page.setViewportSize(currentViewport);
    }
    throw error;
  }
}

async function checkImageDimensions(buffer) {
  const metadata = await sharp(buffer).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions');
  }

  return {
    width: metadata.width,
    height: metadata.height,
    exceedsLimit: metadata.width > 8000 || metadata.height > 8000
  };
}

async function resizeImageBuffer(buffer, maxWidth = 8000, maxHeight = 8000, quality = 90) {
  const sharpInstance = sharp(buffer);
  const metadata = await sharpInstance.metadata();

  if (!metadata.width || !metadata.height) {
    return buffer;
  }

  if (metadata.width > maxWidth || metadata.height > maxHeight) {
    return sharpInstance
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality })
      .toBuffer();
  }

  return buffer;
}

async function testScreenshotUtils() {
  console.log('🧪 Testing Playwright Screenshot Utils...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to a test page
    console.log('📍 Navigating to test page...');
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');
    
    // Test 1: Basic safe screenshot
    console.log('🔍 Test 1: Basic safe screenshot');
    const basicResult = await captureScreenshotSafe(page, {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 85,
      format: 'jpeg'
    });
    
    console.log(`   ✅ Screenshot captured: ${basicResult.finalDimensions.width}x${basicResult.finalDimensions.height}`);
    console.log(`   📊 Was resized: ${basicResult.resized}`);
    if (basicResult.originalDimensions) {
      console.log(`   📏 Original size: ${basicResult.originalDimensions.width}x${basicResult.originalDimensions.height}`);
    }
    
    // Test 2: Check dimensions
    console.log('\n🔍 Test 2: Check image dimensions');
    const dimensions = await checkImageDimensions(basicResult.buffer);
    console.log(`   📐 Final dimensions: ${dimensions.width}x${dimensions.height}`);
    console.log(`   ⚠️  Exceeds 8000px limit: ${dimensions.exceedsLimit}`);
    
    // Test 3: Full page screenshot
    console.log('\n🔍 Test 3: Full page screenshot');
    const fullPageResult = await captureFullPageScreenshotSafe(page, {
      maxWidth: 2000,
      maxHeight: 2000,
      quality: 90
    });
    
    console.log(`   ✅ Full page captured: ${fullPageResult.finalDimensions.width}x${fullPageResult.finalDimensions.height}`);
    console.log(`   📊 Was resized: ${fullPageResult.resized}`);
    
    // Test 4: Manual buffer resizing
    console.log('\n🔍 Test 4: Manual buffer resizing');
    const originalBuffer = await page.screenshot();
    const originalDims = await checkImageDimensions(originalBuffer);
    console.log(`   📏 Original buffer: ${originalDims.width}x${originalDims.height}`);
    
    const resizedBuffer = await resizeImageBuffer(originalBuffer, 500, 500, 80);
    const resizedDims = await checkImageDimensions(resizedBuffer);
    console.log(`   📐 Resized buffer: ${resizedDims.width}x${resizedDims.height}`);
    
    // Test 5: Large viewport to trigger resizing
    console.log('\n🔍 Test 5: Large viewport test');
    await page.setViewportSize({ width: 4000, height: 3000 });
    
    const largeResult = await captureScreenshotSafe(page, {
      maxWidth: 1500,
      maxHeight: 1500
    });
    
    console.log(`   ✅ Large viewport handled: ${largeResult.finalDimensions.width}x${largeResult.finalDimensions.height}`);
    console.log(`   📊 Was resized: ${largeResult.resized}`);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// Run the test
testScreenshotUtils().catch(console.error);