const { chromium } = require('playwright');

async function testVendorsMobileBeforeFixes() {
  const browser = await chromium.launch({ headless: false });
  
  // Test across multiple viewports
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'Samsung Galaxy S21', width: 384, height: 854 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'Small Mobile', width: 320, height: 568 },
    { name: 'Large Mobile', width: 414, height: 896 },
    { name: 'Tablet Portrait', width: 834, height: 1194 }
  ];

  console.log('🧪 Testing Vendors Mobile Responsiveness (Before Fixes)');
  
  let totalIssues = 0;
  let criticalIssues = 0;
  
  for (const viewport of viewports) {
    console.log(`\n📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to vendors page
      await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      let viewportIssues = 0;
      
      // Check for container overflow
      const overflowElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const overflowing = [];
        
        elements.forEach(el => {
          if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
            const rect = el.getBoundingClientRect();
            if (rect.width > window.innerWidth) {
              overflowing.push({
                tag: el.tagName,
                className: el.className || '',
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth,
                boundingWidth: rect.width
              });
            }
          }
        });
        
        return overflowing;
      });
      
      if (overflowElements.length > 0) {
        console.log(`   ⚠️  Container overflow detected:`);
        overflowElements.forEach(el => {
          console.log(`      - ${el.tag}.${el.className} (${el.boundingWidth}px > ${viewport.width}px)`);
          viewportIssues++;
          if (el.boundingWidth > viewport.width + 50) criticalIssues++;
        });
      }
      
      // Check touch target sizes
      const smallTouchTargets = await page.evaluate(() => {
        const clickable = document.querySelectorAll('button, a, [role="button"], select, input, [tabindex]');
        const small = [];
        
        clickable.forEach(el => {
          const rect = el.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(el);
          
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              small.push({
                tag: el.tagName,
                className: el.className || '',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                text: el.textContent?.trim().substring(0, 30) || '',
                type: el.type || '',
                role: el.getAttribute('role') || ''
              });
            }
          }
        });
        
        return small;
      });
      
      if (smallTouchTargets.length > 0) {
        console.log(`   ⚠️  Small touch targets (< 44px):`);
        smallTouchTargets.forEach(target => {
          console.log(`      - ${target.tag}.${target.className} (${target.width}x${target.height}px) "${target.text}"`);
          viewportIssues++;
        });
      }
      
      // Check element visibility and clipping
      const clippedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="grid"], [class*="flex"], .card, .button');
        const clipped = [];
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.left < 0 || rect.right > window.innerWidth) {
            clipped.push({
              tag: el.tagName,
              className: el.className || '',
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              windowWidth: window.innerWidth
            });
          }
        });
        
        return clipped;
      });
      
      if (clippedElements.length > 0) {
        console.log(`   ⚠️  Elements extending beyond viewport:`);
        clippedElements.forEach(el => {
          console.log(`      - ${el.tag}.${el.className} (left: ${el.left}px, right: ${el.right}px, viewport: ${el.windowWidth}px)`);
          viewportIssues++;
        });
      }
      
      // Take screenshot for comparison
      const screenshotPath = `vendors-mobile-before-fixes-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true,
        quality: 80,
        type: 'jpeg'
      });
      
      totalIssues += viewportIssues;
      
      if (viewportIssues === 0) {
        console.log(`   ✅ No mobile responsiveness issues found`);
      } else {
        console.log(`   📊 Total issues for ${viewport.name}: ${viewportIssues}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error testing ${viewport.name}:`, error.message);
    }
    
    await context.close();
  }
  
  console.log(`\n📊 FINAL RESULTS (Before Fixes):`);
  console.log(`   Total Issues: ${totalIssues}`);
  console.log(`   Critical Issues: ${criticalIssues}`);
  console.log(`   Screenshots saved for comparison`);
  
  await browser.close();
}

testVendorsMobileBeforeFixes().catch(console.error);