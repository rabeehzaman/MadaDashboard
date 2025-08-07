const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
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
    
    // Try direct navigation to vendors page
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('✅ Navigated to vendors page');
    
    // Screenshot vendors page in light mode
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-lightmode-full.png`, 
      fullPage: true 
    });
    
    // Look for vendor aging table specifically
    console.log('🔍 Looking for vendor aging table...');
    
    const possibleSelectors = [
      'text="Vendor Aging Balance"',
      '[class*="aging"]',
      'table',
      '[role="table"]',
      '.card:has-text("Vendor")',
      '.card:has-text("aging")',
      '.card:has-text("balance")'
    ];
    
    let agingTableFound = false;
    let agingSelector = '';
    
    for (const selector of possibleSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.screenshot({ 
            path: `${screenshotFolder}/vendor-aging-lightmode-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` 
          });
          console.log(`✅ Found aging component with selector: ${selector}`);
          agingTableFound = true;
          agingSelector = selector;
          break;
        }
      } catch (e) {
        console.log(`❌ Selector "${selector}" not found: ${e.message}`);
        continue;
      }
    }
    
    if (!agingTableFound) {
      console.log('⚠️ Vendor aging table not found, checking page content...');
      
      // Check what's actually on the page
      const pageContent = await page.evaluate(() => {
        return {
          title: document.title,
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent).slice(0, 10),
          cards: Array.from(document.querySelectorAll('.card, [class*="card"]')).map(c => c.textContent?.substring(0, 100)).slice(0, 5),
          tables: document.querySelectorAll('table').length
        };
      });
      
      console.log('Page content:', JSON.stringify(pageContent, null, 2));
    }
    
    console.log('🌙 Switching to dark mode...');
    
    // Look for theme toggle button
    const themeToggleSelectors = [
      'button:has-text("Toggle theme")',
      'button[aria-label*="theme"]',
      'button[aria-label*="Toggle"]',
      '[data-testid="theme-toggle"]',
      'button:has([data-lucide="sun"])',
      'button:has([data-lucide="moon"])',
      'button svg[class*="sun"]',
      'button svg[class*="moon"]'
    ];
    
    let darkModeToggled = false;
    for (const selector of themeToggleSelectors) {
      try {
        const toggleButton = page.locator(selector).first();
        if (await toggleButton.isVisible()) {
          await toggleButton.click();
          await page.waitForTimeout(1500); // Wait for theme to apply
          console.log(`✅ Toggled dark mode with: ${selector}`);
          darkModeToggled = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!darkModeToggled) {
      console.log('⚠️ Could not find theme toggle, trying manual approach...');
      
      // Try different approaches to enable dark mode
      await page.evaluate(() => {
        // Method 1: localStorage
        localStorage.setItem('theme', 'dark');
        
        // Method 2: Add dark class to html
        document.documentElement.classList.add('dark');
        
        // Method 3: Try to find and click theme button via JS
        const themeButtons = document.querySelectorAll('button');
        for (const btn of themeButtons) {
          if (btn.textContent?.includes('theme') || 
              btn.getAttribute('aria-label')?.includes('theme') ||
              btn.querySelector('svg')) {
            btn.click();
            break;
          }
        }
      });
      
      await page.waitForTimeout(1000);
      console.log('🔄 Applied dark mode manually');
    }
    
    console.log('📸 Taking dark mode screenshots...');
    
    // Screenshot full page in dark mode
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-darkmode-full.png`, 
      fullPage: true 
    });
    
    // Screenshot the aging table in dark mode if found
    if (agingTableFound && agingSelector) {
      try {
        const element = page.locator(agingSelector).first();
        if (await element.isVisible()) {
          await element.screenshot({ 
            path: `${screenshotFolder}/vendor-aging-darkmode.png` 
          });
          console.log(`✅ Dark mode aging table captured`);
        }
      } catch (e) {
        console.log(`⚠️ Could not capture aging table in dark mode: ${e.message}`);
      }
    }
    
    // Analyze specific dark mode styling issues
    console.log('🔍 Analyzing dark mode styling...');
    
    const darkModeAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        issues: [],
        tableElements: [],
        theme: localStorage.getItem('theme')
      };
      
      // Check tables specifically
      const tables = document.querySelectorAll('table, [role="table"]');
      tables.forEach((table, index) => {
        const styles = window.getComputedStyle(table);
        const parentStyles = window.getComputedStyle(table.parentElement || table);
        
        analysis.tableElements.push({
          index,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
          parentBackgroundColor: parentStyles.backgroundColor,
          className: table.className,
          hasDataRows: table.querySelectorAll('tbody tr, [role="row"]').length
        });
      });
      
      // Check for potential contrast issues
      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(allElements.length, 100); i++) {
        const element = allElements[i];
        const styles = window.getComputedStyle(element);
        
        if (styles.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
        
        const bg = styles.backgroundColor;
        const color = styles.color;
        
        // Simple contrast check
        if ((bg.includes('255, 255, 255') && color.includes('255, 255, 255')) ||
            (bg.includes('0, 0, 0') && color.includes('0, 0, 0'))) {
          analysis.issues.push({
            tagName: element.tagName,
            className: element.className.substring(0, 50),
            backgroundColor: bg,
            color: color,
            textContent: element.textContent?.substring(0, 30)
          });
        }
      }
      
      return analysis;
    });
    
    // Save analysis
    fs.writeFileSync(
      `${screenshotFolder}/darkmode-analysis.json`, 
      JSON.stringify(darkModeAnalysis, null, 2)
    );
    
    console.log(`\n📊 Dark Mode Analysis Complete:`);
    console.log(`Dark mode active: ${darkModeAnalysis.darkModeActive}`);
    console.log(`Theme setting: ${darkModeAnalysis.theme}`);
    console.log(`Tables found: ${darkModeAnalysis.tableElements.length}`);
    console.log(`Potential issues: ${darkModeAnalysis.issues.length}`);
    
    if (darkModeAnalysis.issues.length > 0) {
      console.log('\n⚠️ Potential contrast issues:');
      darkModeAnalysis.issues.slice(0, 5).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.tagName}: ${issue.textContent} - bg: ${issue.backgroundColor}, color: ${issue.color}`);
      });
    }
    
    console.log(`\n📁 All screenshots saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error during testing: ${error.message}`);
    console.error(error.stack);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();