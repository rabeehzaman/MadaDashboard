const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-table-fix-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔧 Testing Vendor Table Dark Mode Fix');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Test the fix
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking after-fix screenshots...');
    
    // Full page screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-darkmode-fixed-full.png`, 
      fullPage: true 
    });
    
    // Find and screenshot vendor aging table
    const agingTableCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
    if (await agingTableCard.isVisible()) {
      await agingTableCard.screenshot({ 
        path: `${screenshotFolder}/vendor-aging-table-fixed.png` 
      });
      console.log('✅ Aging table screenshot captured');
    }
    
    // Analyze the fix
    const tableAnalysis = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const analysis = [];
      
      tables.forEach((table, index) => {
        const tableStyles = window.getComputedStyle(table);
        const parentDiv = table.closest('div');
        const parentStyles = parentDiv ? window.getComputedStyle(parentDiv) : null;
        
        // Find the card container
        const cardContainer = table.closest('.card, [class*="card"]');
        const cardStyles = cardContainer ? window.getComputedStyle(cardContainer) : null;
        
        // Get table context
        const tableContext = table.closest('div')?.textContent?.includes('Vendor Aging') ? 'Vendor Aging' : 
                            table.closest('div')?.textContent?.includes('Bills') ? 'Bills' :
                            table.closest('div')?.textContent?.includes('Payment') ? 'Payments' : 'Other';
        
        analysis.push({
          index,
          context: tableContext,
          table: {
            backgroundColor: tableStyles.backgroundColor,
            color: tableStyles.color,
            borderColor: tableStyles.borderColor,
            className: table.className
          },
          parent: parentStyles ? {
            backgroundColor: parentStyles.backgroundColor,
            color: parentStyles.color,
            borderColor: parentStyles.borderColor,
            className: parentDiv.className
          } : null,
          card: cardStyles ? {
            backgroundColor: cardStyles.backgroundColor,
            color: cardStyles.color,
            borderColor: cardStyles.borderColor,
            className: cardContainer.className
          } : null,
          isFixed: !parentStyles?.backgroundColor?.includes('255, 255, 255') // Check if no longer white
        });
      });
      
      return analysis;
    });
    
    console.log('📊 Fixed Table Analysis:');
    let fixedCount = 0;
    tableAnalysis.forEach(table => {
      const status = table.isFixed ? '✅ FIXED' : '❌ STILL WHITE';
      console.log(`\n${status} Table ${table.index} (${table.context}):`);
      console.log(`  Table bg: ${table.table.backgroundColor}`);
      console.log(`  Parent bg: ${table.parent?.backgroundColor || 'N/A'}`);
      console.log(`  Card bg: ${table.card?.backgroundColor || 'N/A'}`);
      if (table.isFixed) fixedCount++;
    });
    
    // Take individual table screenshots after fix
    const tables = await page.locator('table').all();
    for (let i = 0; i < tables.length; i++) {
      try {
        await tables[i].screenshot({ 
          path: `${screenshotFolder}/table-${i}-fixed.png` 
        });
      } catch (e) {
        console.log(`⚠️ Could not screenshot table ${i}`);
      }
    }
    
    // Compare with other pages for consistency
    console.log('🔍 Checking consistency with other pages...');
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/overview-darkmode-comparison.png`, 
      fullPage: true 
    });
    
    // Save detailed analysis
    fs.writeFileSync(
      `${screenshotFolder}/fix-analysis.json`, 
      JSON.stringify(tableAnalysis, null, 2)
    );
    
    console.log(`\n📊 FIX RESULTS:`);
    console.log(`Tables analyzed: ${tableAnalysis.length}`);
    console.log(`Tables fixed: ${fixedCount}`);
    console.log(`Success rate: ${((fixedCount / tableAnalysis.length) * 100).toFixed(1)}%`);
    
    if (fixedCount === tableAnalysis.length) {
      console.log('🎉 ALL TABLES FIXED! Dark mode consistency achieved.');
    } else {
      console.log('⚠️ Some tables may still need adjustment.');
    }
    
    console.log(`\n📁 All files saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();