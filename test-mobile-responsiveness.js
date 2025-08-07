#!/usr/bin/env node

/**
 * Comprehensive mobile responsiveness test for customers tab
 * Usage: node test-mobile-responsiveness.js
 */

const { chromium } = require('playwright');
const sharp = require('sharp');

// Common mobile device viewports
const MOBILE_VIEWPORTS = {
  'iPhone SE': { width: 375, height: 667 },
  'iPhone 12': { width: 390, height: 844 },
  'iPhone 12 Pro Max': { width: 428, height: 926 },
  'Samsung Galaxy S21': { width: 360, height: 800 },
  'iPad Mini': { width: 768, height: 1024 },
  'Small Mobile': { width: 320, height: 568 },
  'Large Mobile': { width: 480, height: 854 }
};

// Safe screenshot function
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

async function checkElementVisibility(page, selector, elementName) {
  try {
    const element = await page.$(selector);
    if (!element) {
      return { visible: false, reason: 'Element not found' };
    }

    const isVisible = await element.isVisible();
    if (!isVisible) {
      return { visible: false, reason: 'Element hidden' };
    }

    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
      return { visible: false, reason: 'No bounding box' };
    }

    return {
      visible: true,
      boundingBox,
      elementName
    };
  } catch (error) {
    return { visible: false, reason: error.message };
  }
}

async function checkForOverflowIssues(page) {
  const issues = [];

  // Check for horizontal scrollbars
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  if (hasHorizontalScroll) {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    issues.push({
      type: 'horizontal_overflow',
      description: `Horizontal scroll detected: content width ${scrollWidth}px > viewport ${clientWidth}px`,
      severity: 'high'
    });
  }

  // Check for elements extending beyond viewport
  const overflowingElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const viewportWidth = window.innerWidth;
    const overflowing = [];

    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth && rect.width > 10) { // Ignore tiny elements
        overflowing.push({
          tagName: el.tagName,
          className: el.className || '',
          id: el.id || '',
          right: rect.right,
          width: rect.width,
          overflow: rect.right - viewportWidth
        });
      }
    });

    return overflowing.slice(0, 5); // Limit to first 5 issues
  });

  overflowingElements.forEach(el => {
    issues.push({
      type: 'element_overflow',
      description: `${el.tagName}${el.className ? '.' + (el.className.split ? el.className.split(' ')[0] : el.className) : ''}${el.id ? '#' + el.id : ''} extends ${el.overflow}px beyond viewport`,
      severity: 'medium'
    });
  });

  return issues;
}

async function checkTouchTargets(page) {
  const issues = [];

  // Check for touch targets that are too small (< 44px as per WCAG)
  const smallTouchTargets = await page.evaluate(() => {
    const clickable = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [onclick]');
    const small = [];

    clickable.forEach(el => {
      const rect = el.getBoundingClientRect();
      const minSize = 44; // Minimum touch target size

      if ((rect.width < minSize || rect.height < minSize) && rect.width > 0 && rect.height > 0) {
        small.push({
          tagName: el.tagName,
          className: el.className || '',
          id: el.id || '',
          width: rect.width,
          height: rect.height,
          text: el.textContent?.slice(0, 50) || ''
        });
      }
    });

    return small.slice(0, 10); // Limit results
  });

  smallTouchTargets.forEach(target => {
    issues.push({
      type: 'small_touch_target',
      description: `${target.tagName} (${target.width}x${target.height}px) is smaller than recommended 44x44px: "${target.text.trim()}"`,
      severity: 'medium'
    });
  });

  return issues;
}

async function testViewportResponsiveness(page, viewportName, viewport) {
  console.log(`\n📱 Testing ${viewportName} (${viewport.width}x${viewport.height})`);
  
  await page.setViewportSize(viewport);
  await page.waitForTimeout(1000); // Wait for responsive changes

  const results = {
    viewport: viewportName,
    dimensions: viewport,
    issues: [],
    screenshots: {}
  };

  // Take screenshot
  try {
    const screenshotResult = await captureScreenshotSafe(page, {
      maxWidth: 2000,
      maxHeight: 4000,
      quality: 85,
      format: 'jpeg',
      path: `mobile-test-${viewportName.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      fullPage: true
    });
    
    results.screenshots.main = {
      dimensions: screenshotResult.finalDimensions,
      resized: screenshotResult.resized,
      path: `mobile-test-${viewportName.toLowerCase().replace(/\s+/g, '-')}.jpg`
    };
    
    console.log(`   📸 Screenshot: ${screenshotResult.finalDimensions.width}x${screenshotResult.finalDimensions.height}`);
  } catch (error) {
    console.log(`   ❌ Screenshot failed: ${error.message}`);
  }

  // Check key elements visibility
  const elementsToCheck = [
    { selector: 'nav, [role="navigation"]', name: 'Navigation' },
    { selector: 'table, .table', name: 'Data table' },
    { selector: 'button', name: 'Buttons' },
    { selector: '.sidebar, [data-testid*="sidebar"]', name: 'Sidebar' },
    { selector: 'input, select', name: 'Form controls' },
    { selector: '.chart, [data-testid*="chart"]', name: 'Charts' }
  ];

  for (const element of elementsToCheck) {
    const visibility = await checkElementVisibility(page, element.selector, element.name);
    if (!visibility.visible) {
      results.issues.push({
        type: 'element_not_visible',
        description: `${element.name} not visible: ${visibility.reason}`,
        severity: 'medium'
      });
    } else {
      console.log(`   ✅ ${element.name}: visible`);
    }
  }

  // Check for overflow issues
  const overflowIssues = await checkForOverflowIssues(page);
  results.issues.push(...overflowIssues);

  // Check touch targets
  const touchIssues = await checkTouchTargets(page);
  results.issues.push(...touchIssues);

  // Report issues for this viewport
  if (results.issues.length > 0) {
    console.log(`   ⚠️  Found ${results.issues.length} issues:`);
    results.issues.forEach(issue => {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`      ${icon} ${issue.description}`);
    });
  } else {
    console.log(`   ✅ No responsive issues found!`);
  }

  return results;
}

async function testMobileResponsiveness() {
  console.log('📱 Starting Mobile Responsiveness Test for Customers Tab\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Connect to the app
    const ports = [3002, 3000, 3001];
    let customersUrl = '';
    let connected = false;
    
    for (const port of ports) {
      const url = `http://localhost:${port}/customers`;
      try {
        console.log(`🔗 Trying ${url}...`);
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        customersUrl = url;
        connected = true;
        console.log(`✅ Connected to ${url}`);
        break;
      } catch (error) {
        console.log(`❌ Failed to connect to ${url}`);
      }
    }
    
    if (!connected) {
      throw new Error('Could not connect to customers page. Make sure your dashboard is running.');
    }

    // Wait for content to load
    await page.waitForTimeout(3000);

    const allResults = [];
    const summary = {
      totalViewports: Object.keys(MOBILE_VIEWPORTS).length,
      totalIssues: 0,
      highSeverityIssues: 0,
      mediumSeverityIssues: 0,
      viewportsWithIssues: 0
    };

    // Test each mobile viewport
    for (const [viewportName, viewport] of Object.entries(MOBILE_VIEWPORTS)) {
      const result = await testViewportResponsiveness(page, viewportName, viewport);
      allResults.push(result);

      // Update summary
      if (result.issues.length > 0) {
        summary.viewportsWithIssues++;
        summary.totalIssues += result.issues.length;
        
        result.issues.forEach(issue => {
          if (issue.severity === 'high') summary.highSeverityIssues++;
          if (issue.severity === 'medium') summary.mediumSeverityIssues++;
        });
      }
    }

    // Generate comprehensive report
    console.log('\n🔍 MOBILE RESPONSIVENESS TEST REPORT');
    console.log('=====================================');
    console.log(`📊 Summary:`);
    console.log(`   Total viewports tested: ${summary.totalViewports}`);
    console.log(`   Viewports with issues: ${summary.viewportsWithIssues}`);
    console.log(`   Total issues found: ${summary.totalIssues}`);
    console.log(`   🔴 High severity: ${summary.highSeverityIssues}`);
    console.log(`   🟡 Medium severity: ${summary.mediumSeverityIssues}`);

    if (summary.totalIssues === 0) {
      console.log('\n🎉 Excellent! No mobile responsiveness issues found!');
    } else {
      console.log('\n📋 Detailed Issues by Viewport:');
      
      allResults.forEach(result => {
        if (result.issues.length > 0) {
          console.log(`\n📱 ${result.viewport}:`);
          result.issues.forEach(issue => {
            const icon = issue.severity === 'high' ? '🔴' : '🟡';
            console.log(`   ${icon} ${issue.description}`);
          });
        }
      });

      console.log('\n💡 Recommendations:');
      if (summary.highSeverityIssues > 0) {
        console.log('   🔴 Fix horizontal overflow issues - they break mobile experience');
      }
      if (summary.mediumSeverityIssues > 0) {
        console.log('   🟡 Consider improving touch targets and element visibility');
      }
    }

    console.log('\n📁 Screenshots saved:');
    allResults.forEach(result => {
      if (result.screenshots.main) {
        console.log(`   📸 ${result.screenshots.main.path} (${result.screenshots.main.dimensions.width}x${result.screenshots.main.dimensions.height})`);
      }
    });

    console.log(`\n🔗 Tested URL: ${customersUrl}`);
    console.log('\n✅ Mobile responsiveness test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure your dashboard is running (npm run dev)');
    console.log('   - Check if /customers route is accessible');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the test
testMobileResponsiveness().catch(console.error);