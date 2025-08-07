const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `vendor-tables-debug-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔍 Debugging ALL Vendor Tables for White Background Issues');
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
    
    console.log('📸 Taking full vendors page screenshot...');
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-full-page-darkmode.png`, 
      fullPage: true 
    });
    
    // Analyze ALL tables and their containers
    const allTablesAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        tables: [],
        cards: [],
        whiteBackgroundElements: []
      };
      
      // Find all tables
      const tables = document.querySelectorAll('table');
      tables.forEach((table, index) => {
        const tableStyles = window.getComputedStyle(table);
        const parentWrapper = table.closest('div');
        const parentStyles = parentWrapper ? window.getComputedStyle(parentWrapper) : null;
        const cardContainer = table.closest('.card');
        const cardStyles = cardContainer ? window.getComputedStyle(cardContainer) : null;
        
        // Try to identify the table by nearby text
        let tableContext = 'Unknown';
        const nearbyText = table.closest('div')?.textContent || '';
        if (nearbyText.includes('Vendor Aging')) tableContext = 'Vendor Aging Balance';
        else if (nearbyText.includes('Bills') || nearbyText.includes('bill')) tableContext = 'Vendor Bills';
        else if (nearbyText.includes('Payment') || nearbyText.includes('payment')) tableContext = 'Vendor Payments';
        else if (nearbyText.includes('Performance')) tableContext = 'Vendor Performance';
        else if (nearbyText.includes('Financial')) tableContext = 'Vendor Financial';
        else if (nearbyText.includes('KPI')) tableContext = 'Vendor KPI';
        
        const tableData = {
          index,
          context: tableContext,
          table: {
            backgroundColor: tableStyles.backgroundColor,
            color: tableStyles.color,
            className: table.className
          },
          parent: parentStyles ? {
            backgroundColor: parentStyles.backgroundColor,
            color: parentStyles.color,
            className: parentWrapper.className
          } : null,
          card: cardStyles ? {
            backgroundColor: cardStyles.backgroundColor,
            color: cardStyles.color,
            className: cardContainer.className
          } : null,
          hasWhiteBackground: false
        };
        
        // Check for white backgrounds
        if (parentStyles?.backgroundColor?.includes('255, 255, 255') ||
            cardStyles?.backgroundColor?.includes('255, 255, 255') ||
            tableStyles.backgroundColor?.includes('255, 255, 255')) {
          tableData.hasWhiteBackground = true;
          analysis.whiteBackgroundElements.push({
            type: 'table',
            index,
            context: tableContext,
            element: parentStyles?.backgroundColor?.includes('255, 255, 255') ? 'parent' :
                    cardStyles?.backgroundColor?.includes('255, 255, 255') ? 'card' : 'table'
          });
        }
        
        analysis.tables.push(tableData);
      });
      
      // Find all cards (not just table containers)
      const cards = document.querySelectorAll('.card, [class*="card"]');
      cards.forEach((card, index) => {
        const cardStyles = window.getComputedStyle(card);
        const cardText = card.textContent?.substring(0, 100) || '';
        
        const cardData = {
          index,
          text: cardText,
          backgroundColor: cardStyles.backgroundColor,
          color: cardStyles.color,
          className: card.className,
          hasWhiteBackground: cardStyles.backgroundColor?.includes('255, 255, 255')
        };
        
        if (cardData.hasWhiteBackground) {
          analysis.whiteBackgroundElements.push({
            type: 'card',
            index,
            text: cardText.substring(0, 50),
            element: 'card'
          });
        }
        
        analysis.cards.push(cardData);
      });
      
      return analysis;
    });
    
    // Take individual screenshots of problematic elements
    console.log('📸 Taking individual screenshots of problematic elements...');
    
    const tables = await page.locator('table').all();
    for (let i = 0; i < tables.length; i++) {
      try {
        await tables[i].screenshot({ 
          path: `${screenshotFolder}/table-${i}-analysis.png` 
        });
        console.log(`📸 Table ${i} screenshot saved`);
      } catch (e) {
        console.log(`⚠️ Could not screenshot table ${i}`);
      }
    }
    
    const cards = await page.locator('.card').all();
    for (let i = 0; i < Math.min(cards.length, 10); i++) {
      try {
        await cards[i].screenshot({ 
          path: `${screenshotFolder}/card-${i}-analysis.png` 
        });
      } catch (e) {
        console.log(`⚠️ Could not screenshot card ${i}`);
      }
    }
    
    // Save detailed analysis
    fs.writeFileSync(
      `${screenshotFolder}/all-tables-analysis.json`, 
      JSON.stringify(allTablesAnalysis, null, 2)
    );
    
    console.log('\n📊 COMPLETE VENDOR TABLES ANALYSIS');
    console.log('==================================');
    console.log(`Dark mode active: ${allTablesAnalysis.darkModeActive}`);
    console.log(`Total tables found: ${allTablesAnalysis.tables.length}`);
    console.log(`Total cards found: ${allTablesAnalysis.cards.length}`);
    console.log(`Elements with white background: ${allTablesAnalysis.whiteBackgroundElements.length}`);
    
    if (allTablesAnalysis.whiteBackgroundElements.length > 0) {
      console.log('\n❌ ELEMENTS WITH WHITE BACKGROUNDS:');
      allTablesAnalysis.whiteBackgroundElements.forEach(element => {
        console.log(`  - ${element.type.toUpperCase()} ${element.index}: ${element.context || element.text} (${element.element} has white bg)`);
      });
    }
    
    console.log('\n📋 ALL TABLES BREAKDOWN:');
    allTablesAnalysis.tables.forEach(table => {
      const status = table.hasWhiteBackground ? '❌ WHITE BG' : '✅ DARK OK';
      console.log(`${status} Table ${table.index}: ${table.context}`);
      console.log(`    Table bg: ${table.table.backgroundColor}`);
      console.log(`    Parent bg: ${table.parent?.backgroundColor || 'N/A'}`);
      console.log(`    Card bg: ${table.card?.backgroundColor || 'N/A'}`);
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