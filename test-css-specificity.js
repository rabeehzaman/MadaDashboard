const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `css-specificity-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🎯 CSS Specificity Analysis for Dark Mode Text');
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
    
    // Take a screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-css-debug.png`, 
      fullPage: true 
    });
    
    // Analyze specific table headers that should have dark mode text
    const cssDebug = await page.evaluate(() => {
      const debug = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        tableHeaderAnalysis: [],
        cssRules: []
      };
      
      // Find table headers with text-gray-900 classes
      const headers = document.querySelectorAll('thead th');
      
      headers.forEach((header, index) => {
        const styles = window.getComputedStyle(header);
        const classList = Array.from(header.classList);
        const text = header.textContent?.trim() || '';
        
        debug.tableHeaderAnalysis.push({
          index,
          text: text.substring(0, 30),
          classList,
          computedColor: styles.color,
          computedBackgroundColor: styles.backgroundColor,
          hasTextGray900: classList.includes('text-gray-900'),
          hasDarkTextGray100: classList.some(cls => cls.includes('dark:text-gray-100')),
          allTextClasses: classList.filter(cls => cls.startsWith('text-')),
          cssText: styles.cssText.split(';').filter(rule => rule.includes('color')).join('; ')
        });
      });
      
      // Check what text-foreground resolves to
      const testElement = document.createElement('div');
      testElement.className = 'text-foreground';
      document.body.appendChild(testElement);
      const foregroundColor = window.getComputedStyle(testElement).color;
      document.body.removeChild(testElement);
      
      // Check what text-gray-900 resolves to in dark mode
      const testElement2 = document.createElement('div');
      testElement2.className = 'text-gray-900 dark:text-gray-100';
      document.body.appendChild(testElement2);
      const grayColor = window.getComputedStyle(testElement2).color;
      document.body.removeChild(testElement2);
      
      debug.colorTests = {
        foregroundColor,
        grayWithDarkColor: grayColor
      };
      
      return debug;
    });
    
    // Save analysis
    fs.writeFileSync(
      `${screenshotFolder}/css-debug.json`, 
      JSON.stringify(cssDebug, null, 2)
    );
    
    console.log('\n🎯 CSS SPECIFICITY ANALYSIS');
    console.log('===========================');
    console.log(`Dark mode active: ${cssDebug.darkModeActive}`);
    console.log(`Table headers analyzed: ${cssDebug.tableHeaderAnalysis.length}`);
    
    console.log('\n🎨 COLOR TESTS:');
    console.log(`text-foreground color: ${cssDebug.colorTests.foregroundColor}`);
    console.log(`text-gray-900 dark:text-gray-100 color: ${cssDebug.colorTests.grayWithDarkColor}`);
    
    console.log('\n📊 TABLE HEADER ANALYSIS:');
    cssDebug.tableHeaderAnalysis.slice(0, 10).forEach((header, index) => {
      console.log(`  ${index + 1}. "${header.text}"`);
      console.log(`     Classes: ${header.classList.join(' ')}`);
      console.log(`     Computed Color: ${header.computedColor}`);
      console.log(`     Has text-gray-900: ${header.hasTextGray900}`);
      console.log(`     Has dark:text-gray-100: ${header.hasDarkTextGray100}`);
      console.log(`     Text classes: ${header.allTextClasses.join(', ')}`);
      console.log('');
    });
    
    // Check if the issue is that dark: variants aren't being applied
    const darkModeTest = await page.evaluate(() => {
      // Create a test element to see if dark: classes work
      const testDiv = document.createElement('div');
      testDiv.className = 'text-gray-900 dark:text-gray-100';
      testDiv.textContent = 'Test Text';
      testDiv.style.position = 'fixed';
      testDiv.style.top = '10px';
      testDiv.style.left = '10px';
      testDiv.style.zIndex = '9999';
      testDiv.style.padding = '10px';
      testDiv.style.background = 'yellow';
      document.body.appendChild(testDiv);
      
      const testColor = window.getComputedStyle(testDiv).color;
      
      // Clean up
      document.body.removeChild(testDiv);
      
      return {
        testColor,
        documentHasDarkClass: document.documentElement.classList.contains('dark')
      };
    });
    
    console.log('\n🧪 DARK MODE TEST:');
    console.log(`Document has .dark class: ${darkModeTest.documentHasDarkClass}`);
    console.log(`Test element color: ${darkModeTest.testColor}`);
    
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