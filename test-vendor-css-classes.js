const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-css-classes-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🎨 Analyzing Vendor CSS Classes for Dark Mode Text');
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
    
    // Full page screenshot for reference
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-css-analysis.png`, 
      fullPage: true 
    });
    
    // Analyze CSS classes for problematic text color classes
    const cssAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        problematicClasses: [],
        tableElements: [],
        textColorClasses: new Set(),
        allElementsWithTextClasses: []
      };
      
      // Find elements with specific text color classes that might not work in dark mode
      const problematicTextClasses = [
        'text-gray-900', 'text-gray-800', 'text-gray-700',
        'text-black', 'text-slate-900', 'text-slate-800',
        'text-zinc-900', 'text-neutral-900'
      ];
      
      problematicTextClasses.forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        elements.forEach(element => {
          const styles = window.getComputedStyle(element);
          const text = element.textContent?.trim().substring(0, 50) || '';
          
          analysis.problematicClasses.push({
            className,
            text,
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            tagName: element.tagName,
            element: element.outerHTML.substring(0, 200)
          });
        });
      });
      
      // Check all elements in vendor tables
      const tables = document.querySelectorAll('table');
      tables.forEach((table, tableIndex) => {
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, rowIndex) => {
          if (rowIndex > 5) return; // Limit to first 5 rows
          
          const cells = row.querySelectorAll('th, td');
          cells.forEach((cell, cellIndex) => {
            const styles = window.getComputedStyle(cell);
            const classes = cell.className || '';
            const text = cell.textContent?.trim().substring(0, 30) || '';
            
            // Extract text color classes
            const textColorMatch = classes ? classes.match(/text-\w+-\d+/g) : null;
            if (textColorMatch) {
              textColorMatch.forEach(cls => analysis.textColorClasses.add(cls));
            }
            
            analysis.tableElements.push({
              tableIndex,
              rowIndex,
              cellIndex,
              tagName: cell.tagName,
              text,
              classes,
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              textColorClasses: textColorMatch
            });
          });
        });
      });
      
      // Find all elements with text-* classes
      const allTextElements = document.querySelectorAll('[class*="text-"]');
      allTextElements.forEach((element, index) => {
        if (index > 50) return; // Limit analysis
        
        const classes = element.className || '';
        const textColorMatches = classes.match(/text-\w+-\d+/g);
        
        if (textColorMatches) {
          textColorMatches.forEach(cls => analysis.textColorClasses.add(cls));
          
          const styles = window.getComputedStyle(element);
          analysis.allElementsWithTextClasses.push({
            index,
            tagName: element.tagName,
            text: element.textContent?.trim().substring(0, 40) || '',
            classes: classes.substring(0, 100),
            textColorClasses: textColorMatches,
            computedColor: styles.color,
            computedBackground: styles.backgroundColor
          });
        }
      });
      
      // Convert Set to Array
      analysis.textColorClasses = Array.from(analysis.textColorClasses);
      
      return analysis;
    });
    
    // Save detailed analysis
    fs.writeFileSync(
      `${screenshotFolder}/css-class-analysis.json`, 
      JSON.stringify(cssAnalysis, null, 2)
    );
    
    console.log('\n🎨 CSS CLASS ANALYSIS RESULTS');
    console.log('=============================');
    console.log(`Dark mode active: ${cssAnalysis.darkModeActive}`);
    console.log(`Problematic dark text classes found: ${cssAnalysis.problematicClasses.length}`);
    console.log(`Text color classes used: ${cssAnalysis.textColorClasses.length}`);
    console.log(`Table elements analyzed: ${cssAnalysis.tableElements.length}`);
    
    if (cssAnalysis.problematicClasses.length > 0) {
      console.log('\n❌ PROBLEMATIC TEXT CLASSES FOUND:');
      cssAnalysis.problematicClasses.forEach((item, index) => {
        console.log(`  ${index + 1}. Class: ${item.className}`);
        console.log(`     Text: "${item.text}"`);
        console.log(`     Computed Color: ${item.color}`);
        console.log(`     Tag: ${item.tagName}`);
        console.log('');
      });
    }
    
    console.log('\n🎨 ALL TEXT COLOR CLASSES FOUND:');
    cssAnalysis.textColorClasses.forEach((cls, index) => {
      console.log(`  ${index + 1}. ${cls}`);
    });
    
    // Show sample table elements with their text classes
    console.log('\n📊 SAMPLE TABLE ELEMENTS:');
    cssAnalysis.tableElements.slice(0, 10).forEach((element, index) => {
      if (element.textColorClasses) {
        console.log(`  ${index + 1}. "${element.text}" - Classes: ${element.textColorClasses.join(', ')}`);
        console.log(`     Computed Color: ${element.color}`);
      }
    });
    
    console.log(`\n📁 Detailed analysis saved to: ${screenshotFolder}/css-class-analysis.json`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();