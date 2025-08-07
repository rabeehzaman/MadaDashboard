const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `charts-mobile-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('📱 Testing Business Analytics Charts Mobile Layout');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  try {
    // Test different mobile viewport sizes
    const viewports = [
      { width: 320, height: 568, name: 'iPhone-SE' },
      { width: 375, height: 667, name: 'iPhone-8' },
      { width: 390, height: 844, name: 'iPhone-12' },
      { width: 360, height: 640, name: 'Android-Small' }
    ];
    
    for (const viewport of viewports) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Scroll to Business Analytics section
      const chartsSection = page.locator('text="Business Analytics & Charts"').locator('..').locator('..');
      if (await chartsSection.isVisible()) {
        await chartsSection.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        
        // Take screenshot of the charts section
        await chartsSection.screenshot({ 
          path: `${screenshotFolder}/charts-${viewport.name}.png` 
        });
        
        // Check for horizontal overflow
        const overflowAnalysis = await page.evaluate((viewportWidth) => {
          const chartsCard = document.querySelector('[data-testid="charts-section"]') || 
                            document.evaluate("//h3[contains(text(), 'Business Analytics & Charts')]/ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          
          if (!chartsCard) {
            return { error: 'Charts section not found' };
          }
          
          const rect = chartsCard.getBoundingClientRect();
          const tabsList = chartsCard.querySelector('[role="tablist"]');
          const tabsListRect = tabsList ? tabsList.getBoundingClientRect() : null;
          
          // Check if content overflows viewport
          const hasHorizontalOverflow = rect.width > viewportWidth || rect.right > viewportWidth;
          const tabsOverflow = tabsListRect ? (tabsListRect.width > viewportWidth || tabsListRect.right > viewportWidth) : false;
          
          // Check individual tabs
          const tabs = chartsCard.querySelectorAll('[role="tab"]');
          const tabsAnalysis = Array.from(tabs).map((tab, index) => {
            const tabRect = tab.getBoundingClientRect();
            return {
              index,
              text: tab.textContent?.trim(),
              width: tabRect.width,
              right: tabRect.right,
              overflowsViewport: tabRect.right > viewportWidth
            };
          });
          
          return {
            viewportWidth,
            cardWidth: rect.width,
            cardRight: rect.right,
            hasHorizontalOverflow,
            tabsListWidth: tabsListRect?.width,
            tabsListRight: tabsListRect?.right,
            tabsOverflow,
            tabsAnalysis,
            scrollWidth: chartsCard.scrollWidth,
            clientWidth: chartsCard.clientWidth,
            hasInternalScroll: chartsCard.scrollWidth > chartsCard.clientWidth
          };
        }, viewport.width);
        
        console.log(`  Card width: ${overflowAnalysis.cardWidth}px (viewport: ${viewport.width}px)`);
        console.log(`  Horizontal overflow: ${overflowAnalysis.hasHorizontalOverflow ? '❌ YES' : '✅ NO'}`);
        console.log(`  Tabs overflow: ${overflowAnalysis.tabsOverflow ? '❌ YES' : '✅ NO'}`);
        
        if (overflowAnalysis.tabsAnalysis) {
          console.log('  Tab analysis:');
          overflowAnalysis.tabsAnalysis.forEach(tab => {
            const status = tab.overflowsViewport ? '❌' : '✅';
            console.log(`    ${status} Tab ${tab.index + 1}: "${tab.text}" (width: ${tab.width}px, right: ${tab.right}px)`);
          });
        }
        
        // Save analysis for this viewport
        fs.writeFileSync(
          `${screenshotFolder}/analysis-${viewport.name}.json`, 
          JSON.stringify(overflowAnalysis, null, 2)
        );
      } else {
        console.log('  ⚠️ Charts section not visible');
      }
    }
    
    console.log(`\n📁 All screenshots and analysis saved to: ${screenshotFolder}/`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();