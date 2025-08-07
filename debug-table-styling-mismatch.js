const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `table-styling-debug-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Debugging Table Styling Mismatch in Dark Mode');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  await page.setViewportSize({ width: 1280, height: 720 });
  
  try {
    // Force dark mode and go to vendors page
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log('📸 Taking full page screenshot in dark mode...');
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-darkmode-full.png`, 
      fullPage: true 
    });
    
    // Find and analyze all tables on the page
    console.log('🔍 Analyzing all tables on the page...');
    
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
          } : null
        });
      });
      
      return analysis;
    });
    
    console.log('📊 Table Analysis Results:');
    tableAnalysis.forEach(table => {
      console.log(`\nTable ${table.index} (${table.context}):`);
      console.log(`  Table bg: ${table.table.backgroundColor}`);
      console.log(`  Table color: ${table.table.color}`);
      console.log(`  Card bg: ${table.card?.backgroundColor || 'N/A'}`);
      console.log(`  Card color: ${table.card?.color || 'N/A'}`);
    });
    
    // Take individual table screenshots
    const tables = await page.locator('table').all();
    for (let i = 0; i < tables.length; i++) {
      try {
        await tables[i].screenshot({ 
          path: `${screenshotFolder}/table-${i}-darkmode.png` 
        });
        console.log(`📸 Screenshot taken for table ${i}`);
      } catch (e) {
        console.log(`⚠️ Could not screenshot table ${i}: ${e.message}`);
      }
    }
    
    // Also take a screenshot of what the tables should look like (other pages)
    console.log('📸 Taking reference screenshots from other pages...');
    
    // Go to overview page to see how tables should look
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/overview-darkmode-reference.png`, 
      fullPage: true 
    });
    
    // Go to customers page for another reference
    await page.goto('http://localhost:3000/customers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: `${screenshotFolder}/customers-darkmode-reference.png`, 
      fullPage: true 
    });
    
    // Save analysis to file
    fs.writeFileSync(
      `${screenshotFolder}/table-analysis.json`, 
      JSON.stringify(tableAnalysis, null, 2)
    );
    
    console.log(`\n📁 Analysis complete! Files saved to: ${screenshotFolder}/`);
    console.log('\n💡 Next: Compare table styling between vendors page and other pages');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();