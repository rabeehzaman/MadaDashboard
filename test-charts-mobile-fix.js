const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const screenshotFolder = `charts-mobile-fix-${Date.now()}`;
  fs.mkdirSync(screenshotFolder, { recursive: true });
  
  console.log('✅ Testing Business Analytics Charts Mobile Fix');
  console.log(`Screenshots will be saved to: ${screenshotFolder}/`);
  
  try {
    // Test very small mobile viewports that commonly cause issues
    const testViewports = [
      { width: 280, height: 560, name: 'Very-Small' }, // Very narrow phones
      { width: 320, height: 568, name: 'iPhone-SE' },    // iPhone SE
      { width: 360, height: 640, name: 'Small-Android', orientation: 'portrait' },
      { width: 640, height: 360, name: 'Small-Android-Landscape', orientation: 'landscape' }
    ];
    
    for (const viewport of testViewports) {
      console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Find and focus on the Business Analytics section
      try {
        const chartsSection = page.locator('text="Business Analytics & Charts"').first();
        if (await chartsSection.isVisible()) {
          // Scroll to the section
          await chartsSection.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          
          // Take full page screenshot for context
          await page.screenshot({ 
            path: `${screenshotFolder}/full-page-${viewport.name}.png`,
            fullPage: true
          });
          
          // Take focused screenshot of the charts card
          const chartsCard = chartsSection.locator('..').locator('..');
          await chartsCard.screenshot({ 
            path: `${screenshotFolder}/charts-card-${viewport.name}.png` 
          });
          
          // Analyze the layout for overflow issues
          const layoutAnalysis = await page.evaluate(({ viewportWidth, viewportHeight }) => {
            // Find the Business Analytics card
            const chartsTitle = document.evaluate(
              "//h3[contains(text(), 'Business Analytics & Charts')] | //h2[contains(text(), 'Business Analytics & Charts')] | //*[contains(text(), 'Business Analytics & Charts')]",
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            
            if (!chartsTitle) {
              return { error: 'Charts section not found' };
            }
            
            // Find the parent card
            const chartsCard = chartsTitle.closest('[class*="card"]') || chartsTitle.closest('.card');
            if (!chartsCard) {
              return { error: 'Charts card not found' };
            }
            
            const cardRect = chartsCard.getBoundingClientRect();
            
            // Check tabs specifically
            const tabsList = chartsCard.querySelector('[role="tablist"]');
            const tabs = chartsCard.querySelectorAll('[role="tab"]');
            
            let tabsAnalysis = [];
            if (tabs.length > 0) {
              tabsAnalysis = Array.from(tabs).map((tab, index) => {
                const tabRect = tab.getBoundingClientRect();
                const tabText = tab.textContent?.trim() || '';
                return {
                  index: index + 1,
                  text: tabText,
                  width: Math.round(tabRect.width),
                  height: Math.round(tabRect.height),
                  left: Math.round(tabRect.left),
                  right: Math.round(tabRect.right),
                  overflowsRight: tabRect.right > viewportWidth,
                  overflowsLeft: tabRect.left < 0,
                  isVisible: tabRect.width > 0 && tabRect.height > 0
                };
              });
            }
            
            // Check TabsList container
            let tabsListAnalysis = null;
            if (tabsList) {
              const tabsListRect = tabsList.getBoundingClientRect();
              tabsListAnalysis = {
                width: Math.round(tabsListRect.width),
                height: Math.round(tabsListRect.height),
                left: Math.round(tabsListRect.left),
                right: Math.round(tabsListRect.right),
                overflowsRight: tabsListRect.right > viewportWidth,
                overflowsLeft: tabsListRect.left < 0,
                hasHorizontalScroll: tabsList.scrollWidth > tabsList.clientWidth
              };
            }
            
            return {
              viewport: { width: viewportWidth, height: viewportHeight },
              card: {
                width: Math.round(cardRect.width),
                height: Math.round(cardRect.height),
                left: Math.round(cardRect.left),
                right: Math.round(cardRect.right),
                overflowsRight: cardRect.right > viewportWidth,
                overflowsLeft: cardRect.left < 0
              },
              tabsList: tabsListAnalysis,
              tabs: tabsAnalysis,
              tabsCount: tabs.length,
              hasOverflowIssues: cardRect.right > viewportWidth || (tabsListAnalysis && tabsListAnalysis.overflowsRight)
            };
          }, { viewportWidth: viewport.width, viewportHeight: viewport.height });
          
          // Log results
          console.log('  📊 Layout Analysis:');
          console.log(`    Card: ${layoutAnalysis.card?.width || 'N/A'}px wide (viewport: ${viewport.width}px)`);
          console.log(`    Card overflow: ${layoutAnalysis.card?.overflowsRight ? '❌ YES' : '✅ NO'}`);
          
          if (layoutAnalysis.tabsList) {
            console.log(`    TabsList: ${layoutAnalysis.tabsList.width}px wide`);
            console.log(`    TabsList overflow: ${layoutAnalysis.tabsList.overflowsRight ? '❌ YES' : '✅ NO'}`);
            console.log(`    TabsList scroll: ${layoutAnalysis.tabsList.hasHorizontalScroll ? '⚠️ YES' : '✅ NO'}`);
          }
          
          if (layoutAnalysis.tabs && layoutAnalysis.tabs.length > 0) {
            console.log('    Individual tabs:');
            layoutAnalysis.tabs.forEach(tab => {
              const status = tab.overflowsRight ? '❌' : '✅';
              console.log(`      ${status} Tab ${tab.index}: "${tab.text}" (${tab.width}px)`);
            });
          }
          
          // Overall status
          const overallStatus = layoutAnalysis.hasOverflowIssues ? '❌ ISSUES FOUND' : '✅ LOOKS GOOD';
          console.log(`    Overall: ${overallStatus}`);
          
          // Save detailed analysis
          fs.writeFileSync(
            `${screenshotFolder}/analysis-${viewport.name}.json`, 
            JSON.stringify(layoutAnalysis, null, 2)
          );
          
        } else {
          console.log('  ⚠️ Charts section not visible on this viewport');
        }
      } catch (error) {
        console.log(`  ❌ Error testing ${viewport.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📁 All results saved to: ${screenshotFolder}/`);
    console.log('\n✅ Mobile responsiveness test completed!');
    console.log('Check the screenshots to verify the layout improvements.');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    await page.screenshot({ 
      path: `${screenshotFolder}/error-screenshot.png`, 
      fullPage: true 
    });
  }

  await browser.close();
})();