const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Ongoing Dark Mode Monitoring Script for Vendors Tab
 * Use this script to continuously monitor dark mode compliance
 */

(async () => {
  const browser = await chromium.launch({ headless: true }); // Run headless for CI/monitoring
  const page = await browser.newPage();
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFolder = `darkmode-monitor-${timestamp}`;
  fs.mkdirSync(reportFolder, { recursive: true });
  
  console.log('🔍 Dark Mode Monitoring for Vendors Tab');
  console.log(`Report will be saved to: ${reportFolder}/`);
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };
  
  try {
    // Test 1: Basic Dark Mode Activation
    console.log('\n🧪 Test 1: Dark Mode Activation');
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:3000/vendors', { waitUntil: 'networkidle' });
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const darkModeCheck = await page.evaluate(() => ({
      hasDarkClass: document.documentElement.classList.contains('dark'),
      themeStorage: localStorage.getItem('theme')
    }));
    
    const test1Result = {
      name: 'Dark Mode Activation',
      passed: darkModeCheck.hasDarkClass && darkModeCheck.themeStorage === 'dark',
      details: darkModeCheck
    };
    
    results.tests.push(test1Result);
    if (test1Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test1Result.passed ? '✅' : '❌'} Dark mode activation: ${test1Result.passed ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Vendor Aging Table Visibility
    console.log('\n🧪 Test 2: Vendor Aging Table Dark Mode');
    
    const agingTableCheck = await page.evaluate(() => {
      const agingCard = document.querySelector('[class*="card"]:has-text("Vendor Aging Balance"), .card:has(*:contains("Vendor Aging Balance"))');
      if (!agingCard) return { found: false };
      
      const styles = window.getComputedStyle(agingCard);
      const table = agingCard.querySelector('table');
      const tableStyles = table ? window.getComputedStyle(table) : null;
      
      return {
        found: true,
        cardBg: styles.backgroundColor,
        cardColor: styles.color,
        cardBorder: styles.borderColor,
        tableBg: tableStyles?.backgroundColor,
        tableColor: tableStyles?.color,
        hasTable: !!table,
        tableRows: table ? table.querySelectorAll('tbody tr').length : 0
      };
    });
    
    const test2Result = {
      name: 'Vendor Aging Table Dark Mode',
      passed: agingTableCheck.found && agingTableCheck.hasTable,
      details: agingTableCheck,
      warnings: []
    };
    
    // Check for potential contrast issues
    if (agingTableCheck.cardBg === agingTableCheck.cardColor) {
      test2Result.warnings.push('Card background and text color are identical');
    }
    
    results.tests.push(test2Result);
    if (test2Result.passed) {
      results.summary.passed++;
      if (test2Result.warnings.length > 0) results.summary.warnings++;
    } else {
      results.summary.failed++;
    }
    
    console.log(`${test2Result.passed ? '✅' : '❌'} Aging table visibility: ${test2Result.passed ? 'PASS' : 'FAIL'}`);
    if (test2Result.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${test2Result.warnings.join(', ')}`);
    }
    
    // Test 3: Interactive Elements in Dark Mode
    console.log('\n🧪 Test 3: Interactive Elements Dark Mode');
    
    const interactiveCheck = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, button')).slice(0, 10);
      const issues = [];
      
      inputs.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const bg = styles.backgroundColor;
        const color = styles.color;
        const border = styles.borderColor;
        
        // Simple contrast check
        if (bg === color || 
            (bg.includes('255, 255, 255') && color.includes('255, 255, 255')) ||
            (bg.includes('0, 0, 0') && color.includes('0, 0, 0'))) {
          issues.push({
            element: element.tagName,
            type: element.type || 'N/A',
            bg, color, border
          });
        }
      });
      
      return {
        elementsChecked: inputs.length,
        issuesFound: issues.length,
        issues: issues.slice(0, 3) // Limit to first 3 for reporting
      };
    });
    
    const test3Result = {
      name: 'Interactive Elements Dark Mode',
      passed: interactiveCheck.issuesFound === 0,
      details: interactiveCheck
    };
    
    results.tests.push(test3Result);
    if (test3Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test3Result.passed ? '✅' : '❌'} Interactive elements: ${test3Result.passed ? 'PASS' : 'FAIL'}`);
    if (!test3Result.passed) {
      console.log(`   Issues found: ${interactiveCheck.issuesFound}`);
    }
    
    // Test 4: Mobile Dark Mode
    console.log('\n🧪 Test 4: Mobile Dark Mode');
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileCheck = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      const agingSection = document.querySelector('[class*="card"]:has-text("Vendor Aging Balance"), .card:has(*:contains("Vendor Aging Balance"))');
      const mobileView = agingSection ? agingSection.querySelector('.md\\:hidden') : null;
      
      return {
        viewport,
        hasMobileView: !!mobileView,
        agingSectionVisible: agingSection ? window.getComputedStyle(agingSection).display !== 'none' : false
      };
    });
    
    const test4Result = {
      name: 'Mobile Dark Mode',
      passed: mobileCheck.viewport.width <= 375 && mobileCheck.agingSectionVisible,
      details: mobileCheck
    };
    
    results.tests.push(test4Result);
    if (test4Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test4Result.passed ? '✅' : '❌'} Mobile dark mode: ${test4Result.passed ? 'PASS' : 'FAIL'}`);
    
    // Take monitoring screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({ 
      path: `${reportFolder}/monitor-desktop-darkmode.png`, 
      fullPage: true 
    });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ 
      path: `${reportFolder}/monitor-mobile-darkmode.png`, 
      fullPage: true 
    });
    
    // Generate Report
    results.overallStatus = results.summary.failed === 0 ? 'PASS' : 'FAIL';
    results.score = `${results.summary.passed}/${results.tests.length}`;
    
    console.log('\n📊 MONITORING RESULTS');
    console.log('====================');
    console.log(`Overall Status: ${results.overallStatus}`);
    console.log(`Score: ${results.score}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Warnings: ${results.summary.warnings}`);
    
    // Save detailed report
    fs.writeFileSync(
      `${reportFolder}/darkmode-monitor-report.json`, 
      JSON.stringify(results, null, 2)
    );
    
    // Create simple status file for CI/monitoring systems
    fs.writeFileSync(
      `${reportFolder}/status.txt`, 
      `${results.overallStatus}\n${results.score}\n${new Date().toISOString()}`
    );
    
    console.log(`\n📁 Monitor report saved to: ${reportFolder}/`);
    
    // Exit with appropriate code for CI
    if (results.overallStatus === 'FAIL') {
      console.log('❌ Dark mode monitoring detected issues');
      process.exit(1);
    } else {
      console.log('✅ Dark mode monitoring completed successfully');
    }
    
  } catch (error) {
    console.error(`❌ Error during monitoring: ${error.message}`);
    
    results.error = {
      message: error.message,
      stack: error.stack
    };
    
    fs.writeFileSync(
      `${reportFolder}/error-report.json`, 
      JSON.stringify(results, null, 2)
    );
    
    await page.screenshot({ 
      path: `${reportFolder}/error-screenshot.png`, 
      fullPage: true 
    });
    
    process.exit(1);
  }

  await browser.close();
})();