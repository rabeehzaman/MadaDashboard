const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `text-fix-test-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('✅ Testing Text Color Fix');
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
    
    // Take before/after screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-after-text-fix.png`, 
      fullPage: true 
    });
    
    // Test the specific vendor aging balance table
    const agingCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
    if (await agingCard.isVisible()) {
      await agingCard.screenshot({ 
        path: `${screenshotFolder}/vendor-aging-text-fixed.png` 
      });
      console.log('✅ Vendor aging card screenshot captured');
    }
    
    // Re-analyze text colors
    const textAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        textColorIssues: 0,
        foregroundElements: 0,
        grayTextElements: 0,
        sampleColors: []
      };
      
      // Count elements with text-gray-900 (should be 0 now)
      const grayElements = document.querySelectorAll('.text-gray-900');
      analysis.grayTextElements = grayElements.length;
      
      // Count elements with text-foreground
      const foregroundElements = document.querySelectorAll('.text-foreground');
      analysis.foregroundElements = foregroundElements.length;
      
      // Sample some text colors to verify they're readable
      const tableHeaders = document.querySelectorAll('thead th');
      tableHeaders.forEach((header, index) => {
        if (index < 10) {
          const styles = window.getComputedStyle(header);
          const text = header.textContent?.trim() || '';
          
          analysis.sampleColors.push({
            text: text.substring(0, 30),
            color: styles.color,
            classList: Array.from(header.classList).filter(cls => cls.startsWith('text-'))
          });
        }
      });
      
      return analysis;
    });
    
    // Save analysis
    fs.writeFileSync(
      `${screenshotFolder}/text-fix-analysis.json`, 
      JSON.stringify(textAnalysis, null, 2)
    );
    
    console.log('\n✅ TEXT COLOR FIX RESULTS');
    console.log('=========================');
    console.log(`Dark mode active: ${textAnalysis.darkModeActive}`);
    console.log(`Elements with text-gray-900: ${textAnalysis.grayTextElements}`);
    console.log(`Elements with text-foreground: ${textAnalysis.foregroundElements}`);
    
    console.log('\n📊 SAMPLE HEADER COLORS:');
    textAnalysis.sampleColors.forEach((sample, index) => {
      console.log(`  ${index + 1}. "${sample.text}"`);
      console.log(`     Color: ${sample.color}`);
      console.log(`     Text classes: ${sample.classList.join(', ')}`);
      console.log('');
    });
    
    if (textAnalysis.grayTextElements === 0) {
      console.log('🎉 SUCCESS: All text-gray-900 classes have been replaced!');
      console.log('✅ Text should now be visible in dark mode');
    } else {
      console.log(`⚠️ ${textAnalysis.grayTextElements} elements still have text-gray-900 classes`);
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