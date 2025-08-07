const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-text-colors-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Testing Vendor Text Colors in Dark Mode');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Go to vendors page in dark mode
    console.log('📱 Navigating to vendors page...');
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking dark mode screenshots...');
    
    // Full page screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-dark-mode-text.png`, 
      fullPage: true 
    });
    
    // Analyze text colors in dark mode
    const textAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        textColorIssues: [],
        tableHeaders: [],
        tableCells: [],
        cardTitles: [],
        allTextElements: 0
      };
      
      // Check table headers
      const headers = document.querySelectorAll('th');
      headers.forEach((header, index) => {
        const styles = window.getComputedStyle(header);
        const text = header.textContent?.trim() || '';
        
        analysis.tableHeaders.push({
          index,
          text: text.substring(0, 30),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          isBlackText: styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)',
          isDarkBackground: styles.backgroundColor?.includes('rgb(') && 
                           !styles.backgroundColor?.includes('255, 255, 255')
        });
        
        // Flag potential issues
        if (styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)') {
          analysis.textColorIssues.push({
            type: 'table-header',
            element: text.substring(0, 30),
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            issue: 'Black text in dark mode'
          });
        }
      });
      
      // Check table cells
      const cells = document.querySelectorAll('td');
      analysis.allTextElements += cells.length;
      
      cells.forEach((cell, index) => {
        if (index > 20) return; // Limit to first 20 cells for analysis
        
        const styles = window.getComputedStyle(cell);
        const text = cell.textContent?.trim() || '';
        
        analysis.tableCells.push({
          index,
          text: text.substring(0, 30),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          isBlackText: styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)',
          isDarkBackground: styles.backgroundColor?.includes('rgb(') && 
                           !styles.backgroundColor?.includes('255, 255, 255')
        });
        
        // Flag potential issues
        if (styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)') {
          analysis.textColorIssues.push({
            type: 'table-cell',
            element: text.substring(0, 30),
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            issue: 'Black text in dark mode'
          });
        }
      });
      
      // Check card titles and content
      const cardTitles = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="heading"]');
      cardTitles.forEach((title, index) => {
        const styles = window.getComputedStyle(title);
        const text = title.textContent?.trim() || '';
        
        analysis.cardTitles.push({
          index,
          text: text.substring(0, 40),
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          isBlackText: styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)'
        });
        
        // Flag potential issues
        if (styles.color?.includes('0, 0, 0') || styles.color === 'rgb(0, 0, 0)') {
          analysis.textColorIssues.push({
            type: 'card-title',
            element: text.substring(0, 40),
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            issue: 'Black text in dark mode'
          });
        }
      });
      
      // Check for specific problematic classes
      const problemElements = document.querySelectorAll('[class*="text-gray-900"], [class*="text-black"]');
      problemElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const text = element.textContent?.trim() || '';
        
        if (styles.color?.includes('0, 0, 0') || styles.color?.includes('17, 24, 39')) { // gray-900
          analysis.textColorIssues.push({
            type: 'problematic-class',
            element: text.substring(0, 40),
            color: styles.color,
            className: element.className,
            issue: 'Dark text class in dark mode'
          });
        }
      });
      
      return analysis;
    });
    
    // Take specific component screenshots
    console.log('📸 Taking component-specific screenshots...');
    
    // Vendor aging balance card
    try {
      const agingCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
      if (await agingCard.isVisible()) {
        await agingCard.screenshot({ 
          path: `${screenshotFolder}/vendor-aging-text-colors.png` 
        });
        console.log('✅ Vendor aging card screenshot captured');
      }
    } catch (e) {
      console.log('⚠️ Could not screenshot vendor aging card');
    }
    
    // Save analysis
    fs.writeFileSync(
      `${screenshotFolder}/text-color-analysis.json`, 
      JSON.stringify(textAnalysis, null, 2)
    );
    
    console.log('\n🔍 TEXT COLOR ANALYSIS RESULTS');
    console.log('==============================');
    console.log(`Dark mode active: ${textAnalysis.darkModeActive}`);
    console.log(`Total text color issues found: ${textAnalysis.textColorIssues.length}`);
    console.log(`Table headers analyzed: ${textAnalysis.tableHeaders.length}`);
    console.log(`Table cells analyzed: ${textAnalysis.tableCells.length}`);
    console.log(`Card titles analyzed: ${textAnalysis.cardTitles.length}`);
    
    if (textAnalysis.textColorIssues.length > 0) {
      console.log('\n❌ TEXT COLOR ISSUES FOUND:');
      textAnalysis.textColorIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.type}: "${issue.element}"`);
        console.log(`     Color: ${issue.color}`);
        console.log(`     Issue: ${issue.issue}`);
        if (issue.className) {
          console.log(`     Class: ${issue.className.substring(0, 100)}...`);
        }
        console.log('');
      });
    } else {
      console.log('\n✅ No obvious text color issues detected!');
    }
    
    // Show sample colors for debugging
    console.log('\n📊 SAMPLE TEXT COLORS:');
    console.log('Table Headers:');
    textAnalysis.tableHeaders.slice(0, 5).forEach((header, index) => {
      console.log(`  ${index + 1}. "${header.text}" - Color: ${header.color}`);
    });
    
    console.log('\nTable Cells:');
    textAnalysis.tableCells.slice(0, 5).forEach((cell, index) => {
      console.log(`  ${index + 1}. "${cell.text}" - Color: ${cell.color}`);
    });
    
    console.log(`\n📁 Analysis saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();