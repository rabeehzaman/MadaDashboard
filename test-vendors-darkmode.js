const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const page = await browser.newPage();
  
  // Create screenshots folder
  const screenshotFolder = `vendors-darkmode-debug-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Testing Vendors Tab Dark Mode Issues');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  // Set viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Navigate to the site
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking light mode screenshots...');
    
    // Navigate to vendors tab
    await page.click('a[href="/vendors"]');
    await page.waitForTimeout(3000); // Wait for data to load
    
    // Screenshot vendors page in light mode
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-lightmode-full.png`, 
      fullPage: true 
    });
    
    // Focus on vendor aging table
    const vendorAgingTable = page.locator('[class*="vendor-aging"], [class*="VendorAging"], .vendor-aging-balance, [data-testid*="vendor"], [data-testid*="aging"]').first();
    
    // Try different selectors for the vendor aging component
    const possibleSelectors = [
      'text="Vendor Aging Balance"',
      '[class*="aging"]',
      'table',
      '[role="table"]'
    ];
    
    let agingTableFound = false;
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.screenshot({ 
            path: `${screenshotFolder}/vendor-aging-lightmode-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` 
          });
          console.log(`✅ Found aging table with selector: ${selector}`);
          agingTableFound = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!agingTableFound) {
      console.log('⚠️ Vendor aging table not found, taking full page screenshot');
    }
    
    console.log('🌙 Switching to dark mode...');
    
    // Toggle to dark mode - try different selectors for theme toggle
    const themeToggleSelectors = [
      'button[aria-label*="theme"]',
      'button[aria-label*="Toggle"]',
      '[data-testid="theme-toggle"]',
      'button:has-text("Toggle theme")',
      'button:has([class*="sun"]), button:has([class*="moon"])'
    ];
    
    let darkModeToggled = false;
    for (const selector of themeToggleSelectors) {
      try {
        const toggleButton = page.locator(selector).first();
        if (await toggleButton.isVisible()) {
          await toggleButton.click();
          await page.waitForTimeout(1000); // Wait for theme to apply
          console.log(`✅ Toggled dark mode with: ${selector}`);
          darkModeToggled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!darkModeToggled) {
      console.log('⚠️ Could not find theme toggle button');
      // Try manual dark mode via localStorage
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();
      await page.waitForTimeout(3000);
      console.log('🔄 Applied dark mode manually and reloaded');
    }
    
    console.log('📸 Taking dark mode screenshots...');
    
    // Navigate back to vendors if needed
    try {
      await page.click('a[href="/vendors"]');
      await page.waitForTimeout(3000);
    } catch (e) {
      console.log('Already on vendors page');
    }
    
    // Screenshot vendors page in dark mode
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-darkmode-full.png`, 
      fullPage: true 
    });
    
    // Screenshot vendor aging table in dark mode
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.screenshot({ 
            path: `${screenshotFolder}/vendor-aging-darkmode-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` 
          });
          console.log(`✅ Dark mode aging table captured with: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Analyze dark mode contrast issues
    console.log('🔍 Analyzing dark mode contrast issues...');
    
    const contrastIssues = await page.evaluate(() => {
      const issues = [];
      
      // Check for elements that might have poor contrast in dark mode
      const elementsToCheck = document.querySelectorAll(
        'table, th, td, .card, [class*="border"], [class*="bg-"], [class*="text-"]'
      );
      
      elementsToCheck.forEach((element, index) => {
        if (index > 50) return; // Limit to first 50 elements
        
        const styles = window.getComputedStyle(element);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        const borderColor = styles.borderColor;
        
        // Check if background and text colors are too similar
        if (bgColor === textColor || 
            (bgColor.includes('rgb(255, 255, 255)') && textColor.includes('rgb(255, 255, 255)')) ||
            (bgColor.includes('rgb(0, 0, 0)') && textColor.includes('rgb(0, 0, 0)'))) {
          issues.push({
            element: element.tagName,
            className: element.className,
            bgColor,
            textColor,
            borderColor
          });
        }
      });
      
      return issues;
    });
    
    // Save contrast analysis
    fs.writeFileSync(
      `${screenshotFolder}/contrast-analysis.json`, 
      JSON.stringify(contrastIssues, null, 2)
    );
    
    console.log(`\n📊 Dark Mode Analysis Complete:`);
    console.log(`Screenshots saved to: ${screenshotFolder}/`);
    console.log(`Potential contrast issues found: ${contrastIssues.length}`);
    
    if (contrastIssues.length > 0) {
      console.log('\n⚠️ Potential contrast issues:');
      contrastIssues.slice(0, 5).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.element}.${issue.className}: bg=${issue.bgColor}, text=${issue.textColor}`);
      });
    }
    
  } catch (error) {
    console.error(`❌ Error during testing: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();