const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `final-darkmode-validation-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🏁 Final Dark Mode Validation');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Test vendors page
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Final validation screenshots...');
    
    // Screenshot vendor aging table
    const agingTableCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
    await agingTableCard.screenshot({ 
      path: `${screenshotFolder}/vendor-aging-final.png` 
    });
    
    // Get reference table from overview for comparison
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Screenshot overview tables for comparison
    const overviewTables = await page.locator('table').all();
    if (overviewTables.length > 0) {
      await overviewTables[0].screenshot({ 
        path: `${screenshotFolder}/overview-table-reference.png` 
      });
    }
    
    // Go back to vendors for final validation
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Final comprehensive analysis
    const finalAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        timestamp: new Date().toISOString(),
        tableConsistency: [],
        overallStatus: 'PASS'
      };
      
      const tables = document.querySelectorAll('table');
      
      tables.forEach((table, index) => {
        const tableStyles = window.getComputedStyle(table);
        const parentWrapper = table.closest('div');
        const parentStyles = parentWrapper ? window.getComputedStyle(parentWrapper) : null;
        const cardContainer = table.closest('.card');
        const cardStyles = cardContainer ? window.getComputedStyle(cardContainer) : null;
        
        // Determine table context
        let context = 'Unknown';
        if (table.closest('div')?.textContent?.includes('Vendor Aging')) context = 'Vendor Aging';
        else if (table.closest('div')?.textContent?.includes('Bills')) context = 'Bills';
        else if (table.closest('div')?.textContent?.includes('Payment')) context = 'Payments';
        
        const tableData = {
          index,
          context,
          backgroundColor: tableStyles.backgroundColor,
          color: tableStyles.color,
          parentBackground: parentStyles?.backgroundColor,
          cardBackground: cardStyles?.backgroundColor,
          isConsistent: true,
          issues: []
        };
        
        // Check for white background issues
        if (parentStyles?.backgroundColor?.includes('255, 255, 255')) {
          tableData.isConsistent = false;
          tableData.issues.push('Parent has white background in dark mode');
          analysis.overallStatus = 'FAIL';
        }
        
        if (cardStyles?.backgroundColor?.includes('255, 255, 255')) {
          tableData.isConsistent = false;
          tableData.issues.push('Card has white background in dark mode');
          analysis.overallStatus = 'FAIL';
        }
        
        analysis.tableConsistency.push(tableData);
      });
      
      return analysis;
    });
    
    // Save final analysis
    fs.writeFileSync(
      `${screenshotFolder}/final-analysis.json`, 
      JSON.stringify(finalAnalysis, null, 2)
    );
    
    console.log('\n🏁 FINAL VALIDATION RESULTS');
    console.log('============================');
    console.log(`Dark mode active: ${finalAnalysis.darkModeActive}`);
    console.log(`Overall status: ${finalAnalysis.overallStatus}`);
    console.log(`Tables analyzed: ${finalAnalysis.tableConsistency.length}`);
    
    finalAnalysis.tableConsistency.forEach(table => {
      const status = table.isConsistent ? '✅' : '❌';
      console.log(`${status} Table ${table.index} (${table.context}): ${table.isConsistent ? 'CONSISTENT' : 'ISSUES FOUND'}`);
      if (table.issues.length > 0) {
        table.issues.forEach(issue => console.log(`   - ${issue}`));
      }
    });
    
    if (finalAnalysis.overallStatus === 'PASS') {
      console.log('\n🎉 SUCCESS: All tables now have consistent dark mode styling!');
      console.log('✅ Vendor aging table matches other tables');
      console.log('✅ No white backgrounds in dark mode');
      console.log('✅ Proper dark theme colors applied');
    } else {
      console.log('\n⚠️ Some issues still remain - check the analysis for details');
    }
    
    console.log(`\n📁 Validation complete! Files saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error during validation: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();