const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-text-final-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🎯 Final Vendor Text Visibility Test');
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
    
    // Take comprehensive screenshots
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-final-text-fix.png`, 
      fullPage: true 
    });
    
    // Screenshot individual vendor components
    const components = [
      'Vendor Aging Balance',
      'Vendor Financial Insights', 
      'Vendor Performance Scorecard'
    ];
    
    for (const componentName of components) {
      try {
        const component = page.locator(`text="${componentName}"`).locator('..').locator('..');
        if (await component.isVisible()) {
          await component.screenshot({ 
            path: `${screenshotFolder}/${componentName.toLowerCase().replace(/\s+/g, '-')}-final.png` 
          });
          console.log(`✅ ${componentName} screenshot captured`);
        }
      } catch (e) {
        console.log(`⚠️ Could not screenshot ${componentName}`);
      }
    }
    
    // Final comprehensive text analysis
    const finalTextAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        problematicTextClasses: 0,
        foregroundElements: 0,
        mutedForegroundElements: 0,
        remainingGrayTextClasses: [],
        textColorSummary: {
          'text-foreground': 0,
          'text-muted-foreground': 0,
          'text-gray-900': 0,
          'text-gray-800': 0,
          'text-gray-700': 0,
          'text-gray-600': 0
        },
        sampleTextColors: []
      };
      
      // Count different text color classes
      Object.keys(analysis.textColorSummary).forEach(className => {
        const elements = document.querySelectorAll(`.${className}`);
        analysis.textColorSummary[className] = elements.length;
      });
      
      // Find any remaining problematic gray text classes
      const problematicSelectors = ['.text-gray-900', '.text-gray-800', '.text-gray-700'];
      problematicSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          if (element.offsetParent !== null) { // Only visible elements
            const text = element.textContent?.trim().substring(0, 50) || '';
            const styles = window.getComputedStyle(element);
            
            analysis.remainingGrayTextClasses.push({
              selector,
              text,
              color: styles.color,
              classList: Array.from(element.classList).join(' ')
            });
          }
        });
      });
      
      analysis.problematicTextClasses = analysis.remainingGrayTextClasses.length;
      analysis.foregroundElements = analysis.textColorSummary['text-foreground'];
      analysis.mutedForegroundElements = analysis.textColorSummary['text-muted-foreground'];
      
      // Sample some colors to verify they're readable in dark mode
      const allTextElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, td, th');
      let sampleCount = 0;
      
      for (let element of allTextElements) {
        if (sampleCount >= 15) break;
        
        const text = element.textContent?.trim() || '';
        if (text && element.offsetParent !== null) {
          const styles = window.getComputedStyle(element);
          const classList = Array.from(element.classList);
          
          // Only sample elements with text color classes
          if (classList.some(cls => cls.startsWith('text-'))) {
            analysis.sampleTextColors.push({
              text: text.substring(0, 40),
              color: styles.color,
              textClasses: classList.filter(cls => cls.startsWith('text-')),
              tagName: element.tagName
            });
            sampleCount++;
          }
        }
      }
      
      return analysis;
    });
    
    // Save final analysis
    fs.writeFileSync(
      `${screenshotFolder}/final-text-analysis.json`, 
      JSON.stringify(finalTextAnalysis, null, 2)
    );
    
    console.log('\n🎯 FINAL VENDOR TEXT ANALYSIS');
    console.log('=============================');
    console.log(`Dark mode active: ${finalTextAnalysis.darkModeActive}`);
    console.log(`Problematic text classes remaining: ${finalTextAnalysis.problematicTextClasses}`);
    console.log(`Elements using text-foreground: ${finalTextAnalysis.foregroundElements}`);
    console.log(`Elements using text-muted-foreground: ${finalTextAnalysis.mutedForegroundElements}`);
    
    console.log('\n📊 TEXT CLASS SUMMARY:');
    Object.entries(finalTextAnalysis.textColorSummary).forEach(([className, count]) => {
      const status = (className.includes('gray-9') || className.includes('gray-8') || className.includes('gray-7')) && count > 0 ? '❌' : '✅';
      console.log(`  ${status} ${className}: ${count} elements`);
    });
    
    if (finalTextAnalysis.problematicTextClasses > 0) {
      console.log('\n❌ REMAINING PROBLEMATIC CLASSES:');
      finalTextAnalysis.remainingGrayTextClasses.slice(0, 10).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.selector}: "${item.text}"`);
        console.log(`     Color: ${item.color}`);
        console.log(`     Classes: ${item.classList}`);
        console.log('');
      });
    }
    
    console.log('\n🎨 SAMPLE TEXT COLORS:');
    finalTextAnalysis.sampleTextColors.slice(0, 10).forEach((sample, index) => {
      console.log(`  ${index + 1}. "${sample.text}" (${sample.tagName})`);
      console.log(`     Color: ${sample.color}`);
      console.log(`     Classes: ${sample.textClasses.join(', ')}`);
      console.log('');
    });
    
    // Final verdict
    const success = finalTextAnalysis.problematicTextClasses === 0 &&
                   finalTextAnalysis.textColorSummary['text-gray-900'] === 0 &&
                   finalTextAnalysis.textColorSummary['text-gray-800'] === 0;
    
    console.log('\n' + '='.repeat(50));
    console.log(success ? 
      '🎉 SUCCESS: All vendor text visibility issues FIXED!' : 
      '⚠️ Some text visibility issues may remain');
    console.log('='.repeat(50));
    
    console.log(`\n📁 Final analysis saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();