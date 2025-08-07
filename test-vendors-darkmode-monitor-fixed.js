const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Fixed Dark Mode Monitoring Script for Vendors Tab
 */

(async () => {
  const browser = await chromium.launch({ headless: true });
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
      // Find the vendor aging balance card using text content
      const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'));
      const agingCard = cards.find(card => 
        card.textContent && card.textContent.includes('Vendor Aging Balance')
      );
      
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
    if (agingTableCheck.found && agingTableCheck.cardBg === agingTableCheck.cardColor) {
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
    
    // Test 3: Table Specific Dark Mode Styling
    console.log('\n🧪 Test 3: Table Dark Mode Styling');
    
    const tableStyleCheck = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const issues = [];
      const tableData = [];
      
      tables.forEach((table, index) => {
        const tableStyles = window.getComputedStyle(table);
        const headerRow = table.querySelector('thead tr');
        const bodyRows = table.querySelectorAll('tbody tr');
        
        const data = {
          index,
          backgroundColor: tableStyles.backgroundColor,
          color: tableStyles.color,
          borderColor: tableStyles.borderColor,
          hasHeader: !!headerRow,
          rowCount: bodyRows.length,
          headerBg: headerRow ? window.getComputedStyle(headerRow).backgroundColor : null,
          headerColor: headerRow ? window.getComputedStyle(headerRow).color : null
        };
        
        tableData.push(data);
        
        // Check for dark mode issues
        if (data.backgroundColor === data.color) {
          issues.push(`Table ${index}: Background and text color are identical`);
        }
        
        if (data.hasHeader && data.headerBg === data.headerColor) {
          issues.push(`Table ${index}: Header background and text color are identical`);
        }
      });
      
      return {
        tablesFound: tables.length,
        issues,
        tableData: tableData.slice(0, 3) // Limit for reporting
      };
    });
    
    const test3Result = {
      name: 'Table Dark Mode Styling',
      passed: tableStyleCheck.issues.length === 0,
      details: tableStyleCheck
    };
    
    results.tests.push(test3Result);
    if (test3Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test3Result.passed ? '✅' : '❌'} Table styling: ${test3Result.passed ? 'PASS' : 'FAIL'}`);
    if (!test3Result.passed) {
      console.log(`   Issues: ${tableStyleCheck.issues.join(', ')}`);
    }
    
    // Test 4: Interactive Elements
    console.log('\n🧪 Test 4: Interactive Elements Dark Mode');
    
    const interactiveCheck = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      const selects = document.querySelectorAll('select, [role="combobox"]');
      
      const elements = [...inputs, ...buttons, ...selects].slice(0, 10);
      const issues = [];
      
      elements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const bg = styles.backgroundColor;
        const color = styles.color;
        
        // Simple contrast check - avoid transparent backgrounds
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          if (bg === color) {
            issues.push({
              element: element.tagName,
              type: element.type || element.getAttribute('role') || 'N/A',
              issue: 'Background and text color identical',
              bg, color
            });
          }
        }
      });
      
      return {
        elementsChecked: elements.length,
        issuesFound: issues.length,
        issues: issues.slice(0, 3)
      };
    });
    
    const test4Result = {
      name: 'Interactive Elements Dark Mode',
      passed: interactiveCheck.issuesFound === 0,
      details: interactiveCheck
    };
    
    results.tests.push(test4Result);
    if (test4Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test4Result.passed ? '✅' : '❌'} Interactive elements: ${test4Result.passed ? 'PASS' : 'FAIL'}`);
    
    // Test 5: Mobile Responsiveness in Dark Mode
    console.log('\n🧪 Test 5: Mobile Dark Mode');
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileCheck = await page.evaluate(() => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      // Check if vendor aging section is visible on mobile
      const cards = Array.from(document.querySelectorAll('.card, [class*="card"]'));
      const agingCard = cards.find(card => 
        card.textContent && card.textContent.includes('Vendor Aging Balance')
      );
      
      return {
        viewport,
        agingCardFound: !!agingCard,
        agingCardVisible: agingCard ? window.getComputedStyle(agingCard).display !== 'none' : false,
        darkModeActive: document.documentElement.classList.contains('dark')
      };
    });
    
    const test5Result = {
      name: 'Mobile Dark Mode',
      passed: mobileCheck.viewport.width <= 375 && mobileCheck.agingCardVisible && mobileCheck.darkModeActive,
      details: mobileCheck
    };
    
    results.tests.push(test5Result);
    if (test5Result.passed) results.summary.passed++;
    else results.summary.failed++;
    
    console.log(`${test5Result.passed ? '✅' : '❌'} Mobile dark mode: ${test5Result.passed ? 'PASS' : 'FAIL'}`);
    
    // Take monitoring screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: `${reportFolder}/monitor-desktop-darkmode.png`, 
      fullPage: true 
    });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
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
    
    // Provide recommendations
    if (results.summary.failed > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.tests.forEach(test => {
        if (!test.passed) {
          console.log(`- Fix ${test.name}: Check dark mode styling for proper contrast`);
        }
      });
    }
    
    console.log(results.overallStatus === 'PASS' ? 
      '✅ Dark mode monitoring completed successfully' : 
      '❌ Dark mode monitoring detected issues');
    
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
  }

  await browser.close();
})();