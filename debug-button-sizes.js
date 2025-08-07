const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('🔍 Analyzing all button sizes...\n');
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    
    for (let i = 0; i < Math.min(buttons.length, 20); i++) { // Limit to first 20 buttons
      try {
        const button = buttons[i];
        const box = await button.boundingBox();
        const text = await button.textContent();
        const classList = await button.getAttribute('class');
        
        if (box) {
          const dimensions = `${Math.round(box.width)}x${Math.round(box.height)}px`;
          const status = (box.height >= 44 && box.width >= 44) ? '✅' : '❌';
          
          console.log(`${status} Button ${i + 1}: ${dimensions}`);
          console.log(`   Text: "${text?.trim() || 'no text'}"`);
          console.log(`   Classes: ${classList?.substring(0, 100) || 'none'}`);
          console.log(`   Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}\n`);
        }
      } catch (e) {
        console.log(`❌ Button ${i + 1}: Error measuring - ${e.message}\n`);
      }
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }

  await browser.close();
})();