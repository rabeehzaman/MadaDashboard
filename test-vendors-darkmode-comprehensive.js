const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Create screenshots folder
  const timestamp = Date.now();
  const screenshotFolder = `vendors-darkmode-final-${timestamp}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Comprehensive Vendors Dark Mode Testing');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  // Set viewport
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Test 1: Light Mode
    console.log('\n📸 Phase 1: Light Mode Testing');
    
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Ensure light mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/01-vendors-lightmode-full.png`, 
      fullPage: true 
    });
    
    // Screenshot vendor aging table in light mode
    const agingCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
    if (await agingCard.isVisible()) {
      await agingCard.screenshot({ 
        path: `${screenshotFolder}/02-aging-table-lightmode.png` 
      });
      console.log('✅ Light mode aging table captured');
    }
    
    // Test 2: Dark Mode Activation
    console.log('\n🌙 Phase 2: Dark Mode Activation');
    
    // Method 1: Try theme toggle button
    let darkModeApplied = false;
    try {
      const themeToggle = page.locator('button:has-text("Toggle theme")').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(1000);
        
        // Check if dark mode was applied
        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        if (isDark) {
          console.log('✅ Dark mode applied via toggle button');
          darkModeApplied = true;
        }
      }
    } catch (e) {
      console.log('⚠️ Toggle button method failed');
    }
    
    // Method 2: Force dark mode if toggle didn't work
    if (!darkModeApplied) {
      console.log('🔄 Forcing dark mode via JavaScript...');
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
        
        // Trigger any theme change events
        window.dispatchEvent(new Event('storage'));
        document.dispatchEvent(new Event('themechange'));
      });
      await page.waitForTimeout(1000);
      darkModeApplied = true;
    }
    
    // Verify dark mode is active
    const darkModeCheck = await page.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      themeStorage: localStorage.getItem('theme'),
      bodyBg: window.getComputedStyle(document.body).backgroundColor
    }));
    
    console.log('Dark mode status:', darkModeCheck);
    
    // Test 3: Dark Mode Screenshots
    console.log('\n📸 Phase 3: Dark Mode Screenshots');
    
    await page.screenshot({ 
      path: `${screenshotFolder}/03-vendors-darkmode-full.png`, 
      fullPage: true 
    });
    
    // Screenshot vendor aging table in dark mode
    if (await agingCard.isVisible()) {
      await agingCard.screenshot({ 
        path: `${screenshotFolder}/04-aging-table-darkmode.png` 
      });
      console.log('✅ Dark mode aging table captured');
    }
    
    // Test 4: Detailed Analysis
    console.log('\n🔍 Phase 4: Dark Mode Analysis');
    
    const detailedAnalysis = await page.evaluate(() => {
      const analysis = {
        theme: {
          isDark: document.documentElement.classList.contains('dark'),
          localStorage: localStorage.getItem('theme'),
          bodyStyles: window.getComputedStyle(document.body)
        },
        tables: [],
        cards: [],
        potential_issues: []
      };
      
      // Analyze tables
      const tables = document.querySelectorAll('table');
      tables.forEach((table, index) => {
        const styles = window.getComputedStyle(table);
        const headerRow = table.querySelector('thead tr');
        const headerStyles = headerRow ? window.getComputedStyle(headerRow) : null;
        
        analysis.tables.push({
          index,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
          headerBg: headerStyles?.backgroundColor,
          headerColor: headerStyles?.color,
          className: table.className,
          rowCount: table.querySelectorAll('tbody tr').length
        });
      });
      
      // Analyze cards
      const cards = document.querySelectorAll('.card, [class*="card"]');
      cards.forEach((card, index) => {
        if (index > 10) return; // Limit analysis
        
        const styles = window.getComputedStyle(card);
        analysis.cards.push({
          index,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
          className: card.className.substring(0, 100)
        });
      });
      
      // Check for contrast issues
      const textElements = document.querySelectorAll('span, p, div, td, th');
      for (let i = 0; i < Math.min(textElements.length, 50); i++) {
        const element = textElements[i];
        const styles = window.getComputedStyle(element);
        const text = element.textContent?.trim();
        
        if (!text || text.length < 2) continue;
        
        const bg = styles.backgroundColor;
        const color = styles.color;
        
        // Simple contrast issue detection
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          // Check if both background and text are very light or very dark
          const isLightBg = bg.includes('255, 255, 255') || bg.includes('250, 250, 250');
          const isLightText = color.includes('255, 255, 255') || color.includes('250, 250, 250');
          const isDarkBg = bg.includes('0, 0, 0') || bg.includes('10, 10, 10');
          const isDarkText = color.includes('0, 0, 0') || color.includes('10, 10, 10');
          
          if ((isLightBg && isLightText) || (isDarkBg && isDarkText)) {
            analysis.potential_issues.push({
              text: text.substring(0, 30),
              backgroundColor: bg,
              color: color,
              tagName: element.tagName,
              className: element.className.substring(0, 50)
            });
          }
        }
      }
      
      return analysis;
    });
    
    // Save detailed analysis
    fs.writeFileSync(
      `${screenshotFolder}/darkmode-detailed-analysis.json`, 
      JSON.stringify(detailedAnalysis, null, 2)
    );
    
    // Test 5: Mobile Dark Mode
    console.log('\n📱 Phase 5: Mobile Dark Mode Testing');
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/05-vendors-mobile-darkmode.png`, 
      fullPage: true 
    });
    
    // Test 6: Interactive Elements
    console.log('\n🎯 Phase 6: Interactive Elements Testing');
    
    // Test dropdowns and filters in dark mode
    try {
      const riskFilter = page.locator('text="Filter by Risk:"').locator('..').locator('button').first();
      if (await riskFilter.isVisible()) {
        await riskFilter.click();
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: `${screenshotFolder}/06-dropdown-darkmode.png`, 
          fullPage: false 
        });
        await page.keyboard.press('Escape'); // Close dropdown
        console.log('✅ Dropdown dark mode captured');
      }
    } catch (e) {
      console.log('⚠️ Could not test dropdown');
    }
    
    // Summary Report
    console.log('\n📊 FINAL SUMMARY');
    console.log('================');
    console.log(`Dark mode active: ${detailedAnalysis.theme.isDark}`);
    console.log(`Theme storage: ${detailedAnalysis.theme.localStorage}`);
    console.log(`Tables analyzed: ${detailedAnalysis.tables.length}`);
    console.log(`Cards analyzed: ${detailedAnalysis.cards.length}`);
    console.log(`Potential issues: ${detailedAnalysis.potential_issues.length}`);
    
    if (detailedAnalysis.potential_issues.length > 0) {
      console.log('\n⚠️ Potential contrast issues found:');
      detailedAnalysis.potential_issues.slice(0, 3).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.tagName}: "${issue.text}" - bg: ${issue.backgroundColor}`);
      });
    } else {
      console.log('\n✅ No major contrast issues detected!');
    }
    
    console.log(`\n📁 All files saved to: ${screenshotFolder}/`);
    
    // Create summary file
    const summary = {
      timestamp: new Date().toISOString(),
      testResults: {
        darkModeActivated: detailedAnalysis.theme.isDark,
        themeStorage: detailedAnalysis.theme.localStorage,
        tablesFound: detailedAnalysis.tables.length,
        cardsFound: detailedAnalysis.cards.length,
        potentialIssues: detailedAnalysis.potential_issues.length,
        screenshotsTaken: 6
      },
      recommendations: detailedAnalysis.potential_issues.length === 0 ? 
        ['Dark mode appears to be working correctly'] :
        ['Review contrast issues found in detailed analysis', 'Consider improving text/background color combinations']
    };
    
    fs.writeFileSync(
      `${screenshotFolder}/test-summary.json`, 
      JSON.stringify(summary, null, 2)
    );
    
  } catch (error) {
    console.error(`❌ Error during comprehensive testing: ${error.message}`);
    console.error(error.stack);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();