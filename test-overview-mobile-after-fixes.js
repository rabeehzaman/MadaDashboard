const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Test different mobile viewport sizes
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
    { name: 'Samsung Galaxy S20', width: 360, height: 800 },
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'Small Mobile', width: 320, height: 568 },
    { name: 'Large Mobile', width: 414, height: 896 }
  ];

  let allResults = [];

  for (const viewport of viewports) {
    console.log(`\n🔍 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
    
    await page.setViewportSize(viewport);
    
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000); // Wait for components to load
      
      let issues = [];
      
      // Check for touch target size issues (buttons should be at least 44px)
      const touchTargets = await page.locator('button, [role="button"], input, select, [role="tab"], [role="option"]').all();
      
      for (const target of touchTargets) {
        try {
          const box = await target.boundingBox();
          if (box && (box.height < 44 || box.width < 44)) {
            const text = await target.textContent();
            const role = await target.getAttribute('role');
            const tagName = await target.evaluate(el => el.tagName.toLowerCase());
            issues.push(`Touch target too small: ${tagName}${role ? `[role="${role}"]` : ""} "${text?.trim().substring(0, 30) || 'no text'}" - ${Math.round(box.width)}x${Math.round(box.height)}px`);
          }
        } catch (e) {
          // Skip elements that can't be measured
        }
      }
      
      // Check for horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = viewport.width;
      if (bodyWidth > viewportWidth) {
        issues.push(`Horizontal overflow: body width ${bodyWidth}px > viewport ${viewportWidth}px`);
      }
      
      // Check for container overflow specifically
      const containers = await page.locator('div, section, header').all();
      for (const container of containers.slice(0, 20)) { // Check first 20 containers
        try {
          const box = await container.boundingBox();
          if (box && box.width > viewport.width + 10) { // 10px tolerance
            const className = await container.getAttribute('class');
            issues.push(`Container overflow: width ${Math.round(box.width)}px > viewport ${viewport.width}px (class: ${className?.substring(0, 50) || 'none'})`);
          }
        } catch (e) {
          // Skip elements that can't be measured
        }
      }
      
      // Check tab buttons specifically (they were problematic before)
      const tabButtons = await page.locator('[role="tab"]').all();
      for (const tab of tabButtons) {
        try {
          const box = await tab.boundingBox();
          if (box && box.height < 44) {
            const text = await tab.textContent();
            issues.push(`Tab button too small: "${text?.trim()}" - ${Math.round(box.width)}x${Math.round(box.height)}px`);
          }
        } catch (e) {
          // Skip tabs that can't be measured
        }
      }
      
      // Check filter dropdowns
      const selects = await page.locator('select, [role="combobox"]').all();
      for (const select of selects) {
        try {
          const box = await select.boundingBox();
          if (box && box.height < 44) {
            const placeholder = await select.getAttribute('placeholder');
            issues.push(`Select dropdown too small: "${placeholder || 'no placeholder'}" - ${Math.round(box.width)}x${Math.round(box.height)}px`);
          }
        } catch (e) {
          // Skip selects that can't be measured
        }
      }
      
      console.log(`   Found ${issues.length} issues:`);
      issues.forEach(issue => console.log(`   ❌ ${issue}`));
      
      allResults.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        issueCount: issues.length,
        issues: issues
      });
      
    } catch (error) {
      console.log(`   ⚠️  Error testing ${viewport.name}: ${error.message}`);
      allResults.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        issueCount: 'ERROR',
        issues: [`Error: ${error.message}`]
      });
    }
  }

  await browser.close();

  // Summary
  console.log('\n📊 SUMMARY AFTER FIXES:');
  console.log('========================');
  
  let totalIssues = 0;
  allResults.forEach(result => {
    if (typeof result.issueCount === 'number') {
      totalIssues += result.issueCount;
    }
    console.log(`${result.viewport} (${result.size}): ${result.issueCount} issues`);
  });
  
  console.log(`\nTotal issues across all viewports: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('🎉 All mobile responsiveness issues have been fixed!');
  } else {
    console.log('\n⚠️  Remaining issues to address:');
    allResults.forEach(result => {
      if (result.issueCount > 0) {
        console.log(`\n${result.viewport}:`);
        result.issues.forEach(issue => console.log(`  - ${issue}`));
      }
    });
  }
})();