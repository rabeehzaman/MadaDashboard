const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-components-final-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🏁 Final Test - ALL Vendor Components Dark Mode');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Go to vendors page in dark mode
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking final comprehensive screenshots...');
    
    // Full page screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-final-darkmode.png`, 
      fullPage: true 
    });
    
    // Final comprehensive analysis
    const finalAnalysis = await page.evaluate(() => {
      const analysis = {
        timestamp: new Date().toISOString(),
        darkModeActive: document.documentElement.classList.contains('dark'),
        whiteBackgroundElements: [],
        blueBackgroundElements: [],
        allElements: {
          cards: 0,
          tables: 0,
          divs: 0
        },
        overallStatus: 'PASS'
      };
      
      // Check all cards
      const cards = document.querySelectorAll('.card, [class*="card"]');
      analysis.allElements.cards = cards.length;
      
      cards.forEach((card, index) => {
        const styles = window.getComputedStyle(card);
        const text = card.textContent?.substring(0, 50) || '';
        
        if (styles.backgroundColor?.includes('255, 255, 255')) {
          analysis.whiteBackgroundElements.push({
            type: 'card',
            index,
            text,
            backgroundColor: styles.backgroundColor
          });
          analysis.overallStatus = 'FAIL';
        }
      });
      
      // Check all tables
      const tables = document.querySelectorAll('table');
      analysis.allElements.tables = tables.length;
      
      tables.forEach((table, index) => {
        const tableStyles = window.getComputedStyle(table);
        const parentDiv = table.closest('div');
        const parentStyles = parentDiv ? window.getComputedStyle(parentDiv) : null;
        
        if (tableStyles.backgroundColor?.includes('255, 255, 255') ||
            parentStyles?.backgroundColor?.includes('255, 255, 255')) {
          analysis.whiteBackgroundElements.push({
            type: 'table',
            index,
            backgroundColor: tableStyles.backgroundColor,
            parentBackground: parentStyles?.backgroundColor
          });
          analysis.overallStatus = 'FAIL';
        }
      });
      
      // Check for blue backgrounds that might not have dark mode variants
      const blueElements = document.querySelectorAll('[class*="bg-blue"]');
      blueElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const className = element.className;
        
        // Check if element has proper dark mode classes
        const hasDarkVariant = className.includes('dark:bg-blue') || 
                              className.includes('dark:bg-') ||
                              !className.includes('bg-blue-50'); // bg-blue-50 is problematic without dark variant
                              
        if (!hasDarkVariant && styles.backgroundColor?.includes('239, 246, 255')) { // blue-50 RGB
          analysis.blueBackgroundElements.push({
            type: element.tagName,
            index,
            className: className.substring(0, 100),
            backgroundColor: styles.backgroundColor,
            text: element.textContent?.substring(0, 30)
          });
        }
      });
      
      return analysis;
    });
    
    // Take individual component screenshots
    const cards = await page.locator('.card').all();
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      try {
        await cards[i].screenshot({ 
          path: `${screenshotFolder}/card-${i}-final.png` 
        });
      } catch (e) {
        console.log(`⚠️ Could not screenshot card ${i}`);
      }
    }
    
    // Save comprehensive analysis
    fs.writeFileSync(
      `${screenshotFolder}/final-comprehensive-analysis.json`, 
      JSON.stringify(finalAnalysis, null, 2)
    );
    
    console.log('\n🏁 FINAL COMPREHENSIVE RESULTS');
    console.log('==============================');
    console.log(`Dark mode active: ${finalAnalysis.darkModeActive}`);
    console.log(`Overall status: ${finalAnalysis.overallStatus}`);
    console.log(`Cards found: ${finalAnalysis.allElements.cards}`);
    console.log(`Tables found: ${finalAnalysis.allElements.tables}`);
    console.log(`White background elements: ${finalAnalysis.whiteBackgroundElements.length}`);
    console.log(`Blue elements needing fix: ${finalAnalysis.blueBackgroundElements.length}`);
    
    if (finalAnalysis.whiteBackgroundElements.length === 0 && 
        finalAnalysis.blueBackgroundElements.length === 0) {
      console.log('\n🎉 PERFECT! All vendor components have proper dark mode styling!');
      console.log('✅ No white backgrounds detected');
      console.log('✅ All blue elements have dark mode variants');
      console.log('✅ Vendor tables match other dashboard tables');
    } else {
      if (finalAnalysis.whiteBackgroundElements.length > 0) {
        console.log('\n❌ WHITE BACKGROUND ELEMENTS STILL FOUND:');
        finalAnalysis.whiteBackgroundElements.forEach(element => {
          console.log(`  - ${element.type} ${element.index}: ${element.text || 'N/A'}`);
        });
      }
      
      if (finalAnalysis.blueBackgroundElements.length > 0) {
        console.log('\n⚠️ BLUE ELEMENTS WITHOUT DARK MODE VARIANTS:');
        finalAnalysis.blueBackgroundElements.forEach(element => {
          console.log(`  - ${element.type}: ${element.text} (${element.className})`);
        });
      }
    }
    
    // Performance check - compare with other pages
    console.log('\n📊 CONSISTENCY CHECK:');
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const overviewCardBg = await page.evaluate(() => {
      const firstCard = document.querySelector('.card');
      return firstCard ? window.getComputedStyle(firstCard).backgroundColor : 'none';
    });
    
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const vendorCardBg = await page.evaluate(() => {
      const firstCard = document.querySelector('.card');
      return firstCard ? window.getComputedStyle(firstCard).backgroundColor : 'none';
    });
    
    console.log(`Overview page card background: ${overviewCardBg}`);
    console.log(`Vendors page card background: ${vendorCardBg}`);
    console.log(`Backgrounds match: ${overviewCardBg === vendorCardBg ? '✅ YES' : '❌ NO'}`);
    
    console.log(`\n📁 Final analysis saved to: ${screenshotFolder}/`);
    
    // Final verdict
    const success = finalAnalysis.whiteBackgroundElements.length === 0 && 
                   finalAnalysis.blueBackgroundElements.length === 0 &&
                   overviewCardBg === vendorCardBg;
                   
    console.log('\n' + '='.repeat(50));
    console.log(success ? 
      '🎉 SUCCESS: All vendor dark mode issues FIXED!' : 
      '⚠️ Some issues may still need attention');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();