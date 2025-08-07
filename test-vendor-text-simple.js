const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-text-simple-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Simple Vendor Text Color Check');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Go to vendors page in dark mode
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Take screenshots for visual comparison
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-dark-mode-full.png`, 
      fullPage: true 
    });
    
    // Find elements with dark text classes that might not work in dark mode
    const textIssues = await page.evaluate(() => {
      const issues = [];
      
      // Look for specific problematic classes
      const darkTextSelectors = [
        '.text-gray-900',
        '.text-gray-800', 
        '.text-gray-700',
        '.text-black',
        '[class*="text-gray-9"]'
      ];
      
      darkTextSelectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const styles = window.getComputedStyle(element);
            const text = element.textContent?.trim().substring(0, 50) || '';
            const rect = element.getBoundingClientRect();
            
            if (rect.width > 0 && rect.height > 0 && text) {
              issues.push({
                selector,
                text,
                color: styles.color,
                backgroundColor: styles.backgroundColor,
                className: element.className.substring(0, 100),
                visible: element.offsetParent !== null
              });
            }
          });
        } catch (e) {
          console.log(`Error with selector ${selector}:`, e.message);
        }
      });
      
      // Also check for any text that computes to black or very dark
      const allText = document.querySelectorAll('*');
      let blackTextCount = 0;
      
      for (let i = 0; i < Math.min(allText.length, 200); i++) {
        const element = allText[i];
        const styles = window.getComputedStyle(element);
        const text = element.textContent?.trim() || '';
        
        if (text && element.offsetParent !== null) {
          const color = styles.color;
          
          // Check if text is black or very dark
          if (color === 'rgb(0, 0, 0)' || 
              color === 'rgba(0, 0, 0, 1)' ||
              color.includes('rgb(17, 24, 39)') || // gray-900
              color.includes('rgb(31, 41, 55)') || // gray-800
              color.includes('rgb(55, 65, 81)')) { // gray-700
            
            blackTextCount++;
            
            if (issues.length < 20) { // Limit to first 20 issues
              issues.push({
                selector: 'computed-dark-text',
                text: text.substring(0, 50),
                color,
                backgroundColor: styles.backgroundColor,
                className: element.className ? element.className.substring(0, 100) : '',
                tagName: element.tagName,
                visible: true
              });
            }
          }
        }
      }
      
      return {
        issues,
        blackTextCount,
        darkModeActive: document.documentElement.classList.contains('dark')
      };
    });
    
    // Save results
    fs.writeFileSync(
      `${screenshotFolder}/text-issues.json`, 
      JSON.stringify(textIssues, null, 2)
    );
    
    console.log('\n🔍 SIMPLE TEXT COLOR CHECK RESULTS');
    console.log('==================================');
    console.log(`Dark mode active: ${textIssues.darkModeActive}`);
    console.log(`Black/dark text elements found: ${textIssues.blackTextCount}`);
    console.log(`Specific issues identified: ${textIssues.issues.length}`);
    
    if (textIssues.issues.length > 0) {
      console.log('\n❌ DARK TEXT ISSUES FOUND:');
      textIssues.issues.slice(0, 10).forEach((issue, index) => {
        console.log(`  ${index + 1}. Selector: ${issue.selector}`);
        console.log(`     Text: "${issue.text}"`);
        console.log(`     Color: ${issue.color}`);
        console.log(`     Class: ${issue.className}`);
        console.log('');
      });
      
      if (textIssues.issues.length > 10) {
        console.log(`     ... and ${textIssues.issues.length - 10} more issues`);
      }
    } else {
      console.log('\n✅ No dark text issues found with simple check');
    }
    
    console.log(`\n📁 Results saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();