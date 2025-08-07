const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `card-fix-test-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('🔧 Testing Card Background Fix');
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
    
    console.log('📸 Taking after-fix screenshots...');
    
    // Full page screenshot
    await page.screenshot({ 
      path: `${screenshotFolder}/vendors-after-card-fix.png`, 
      fullPage: true 
    });
    
    // Specific vendor aging balance card screenshot
    const agingCard = page.locator('text="Vendor Aging Balance"').locator('..').locator('..');
    if (await agingCard.isVisible()) {
      await agingCard.screenshot({ 
        path: `${screenshotFolder}/vendor-aging-card-fixed.png` 
      });
      console.log('✅ Aging card screenshot captured');
    }
    
    // Re-analyze for white backgrounds
    const cardAnalysis = await page.evaluate(() => {
      const analysis = {
        darkModeActive: document.documentElement.classList.contains('dark'),
        whiteBackgroundElements: [],
        allCards: []
      };
      
      const cards = document.querySelectorAll('.card, [class*="card"]');
      cards.forEach((card, index) => {
        const cardStyles = window.getComputedStyle(card);
        const cardText = card.textContent?.substring(0, 100) || '';
        
        const cardData = {
          index,
          text: cardText.substring(0, 50),
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
            backgroundColor: cardStyles.backgroundColor
          });
        }
        
        analysis.allCards.push(cardData);
      });
      
      return analysis;
    });
    
    // Save analysis
    fs.writeFileSync(
      `${screenshotFolder}/card-fix-analysis.json`, 
      JSON.stringify(cardAnalysis, null, 2)
    );
    
    console.log('\n📊 CARD FIX RESULTS');
    console.log('==================');
    console.log(`Dark mode active: ${cardAnalysis.darkModeActive}`);
    console.log(`Total cards found: ${cardAnalysis.allCards.length}`);
    console.log(`Cards with white background: ${cardAnalysis.whiteBackgroundElements.length}`);
    
    if (cardAnalysis.whiteBackgroundElements.length === 0) {
      console.log('🎉 SUCCESS: No more white background cards!');
      console.log('✅ All cards now use proper dark mode styling');
    } else {
      console.log('\n❌ REMAINING WHITE BACKGROUND CARDS:');
      cardAnalysis.whiteBackgroundElements.forEach(element => {
        console.log(`  - Card ${element.index}: ${element.text}`);
        console.log(`    Background: ${element.backgroundColor}`);
      });
    }
    
    // Check specifically for vendor aging balance card
    const vendorAgingCard = cardAnalysis.allCards.find(card => 
      card.text.includes('Vendor Aging Balance')
    );
    
    if (vendorAgingCard) {
      console.log('\n🎯 VENDOR AGING BALANCE CARD STATUS:');
      console.log(`Background: ${vendorAgingCard.backgroundColor}`);
      console.log(`Has white background: ${vendorAgingCard.hasWhiteBackground ? 'YES ❌' : 'NO ✅'}`);
      console.log(`Status: ${vendorAgingCard.hasWhiteBackground ? 'STILL NEEDS FIX' : 'FIXED!'}`);
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