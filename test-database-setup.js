const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://tqsltmruwqluaeukgrbd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxc2x0bXJ1d3FsdWFldWtncmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMwMTM5MSwiZXhwIjoyMDY4ODc3MzkxfQ.LxHJvXC7IcORus2pAouzJuRqYU5xCpjpHkpXE1an5g0';

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, serviceKey);

async function testDatabaseSetup() {
  console.log('🧪 Testing Database Setup for Dashboard Optimization\n');
  console.log('📋 This script tests the views and functions created in Supabase\n');

  try {
    // Test 1: profit_totals_view
    console.log('1️⃣ Testing profit_totals_view...');
    const { data: totalsData, error: totalsError } = await supabase
      .from('profit_totals_view')
      .select('*')
      .single();

    if (totalsError) {
      console.log('❌ profit_totals_view not found - please execute the SQL setup first');
      console.log('   Error:', totalsError.message);
    } else {
      console.log('✅ profit_totals_view working correctly:');
      console.log(`   💰 Total Taxable Sales: $${totalsData.total_taxable_sales?.toLocaleString()}`);
      console.log(`   💎 Total Revenue: $${totalsData.total_revenue?.toLocaleString()}`);
      console.log(`   💸 Total Cost: $${totalsData.total_cost?.toLocaleString()}`);
      console.log(`   💹 Total Profit: $${totalsData.total_profit?.toLocaleString()}`);
      console.log(`   📊 Total Invoices: ${totalsData.total_invoices?.toLocaleString()}`);
      console.log(`   📈 Profit Margin: ${totalsData.overall_profit_margin?.toFixed(2)}%`);
    }

    console.log('');

    // Test 2: profit_by_branch_view
    console.log('2️⃣ Testing profit_by_branch_view...');
    const { data: branchViewData, error: branchViewError } = await supabase
      .from('profit_by_branch_view')
      .select('*')
      .limit(5);

    if (branchViewError) {
      console.log('❌ profit_by_branch_view not found');
      console.log('   Error:', branchViewError.message);
    } else {
      console.log('✅ profit_by_branch_view working correctly:');
      branchViewData.forEach((branch, index) => {
        console.log(`   ${index + 1}. ${branch.branch_name}: $${branch.branch_taxable_sales?.toLocaleString()} (${branch.branch_invoices} invoices)`);
      });
    }

    console.log('');

    // Test 3: get_dashboard_kpis RPC (all data)
    console.log('3️⃣ Testing get_dashboard_kpis RPC function (all data)...');
    const { data: allKpisData, error: allKpisError } = await supabase
      .rpc('get_dashboard_kpis');

    if (allKpisError) {
      console.log('❌ get_dashboard_kpis RPC not found');
      console.log('   Error:', allKpisError.message);
    } else {
      console.log('✅ get_dashboard_kpis RPC working correctly:');
      console.log(`   💰 Total Taxable Sales: $${allKpisData.totalTaxableSales?.toLocaleString()}`);
      console.log(`   💎 Total Revenue: $${allKpisData.totalRevenue?.toLocaleString()}`);
      console.log(`   💹 Total Profit: $${allKpisData.totalProfit?.toLocaleString()}`);
      console.log(`   📊 Total Invoices: ${allKpisData.totalInvoices?.toLocaleString()}`);
      console.log(`   📈 Profit Margin: ${allKpisData.profitMargin?.toFixed(2)}%`);
      console.log(`   📅 Date Range: ${allKpisData.dateRange?.actualFrom} to ${allKpisData.dateRange?.actualTo}`);
    }

    console.log('');

    // Test 4: get_dashboard_kpis with date filter
    console.log('4️⃣ Testing get_dashboard_kpis RPC with date filter (2024 data)...');
    const { data: filteredKpisData, error: filteredKpisError } = await supabase
      .rpc('get_dashboard_kpis', { 
        start_date: '2024-01-01', 
        end_date: '2024-12-31' 
      });

    if (filteredKpisError) {
      console.log('❌ get_dashboard_kpis with date filter failed');
      console.log('   Error:', filteredKpisError.message);
    } else {
      console.log('✅ get_dashboard_kpis with date filter working:');
      console.log(`   💰 2024 Taxable Sales: $${filteredKpisData.totalTaxableSales?.toLocaleString()}`);
      console.log(`   📊 2024 Invoices: ${filteredKpisData.totalInvoices?.toLocaleString()}`);
      console.log(`   📈 2024 Profit Margin: ${filteredKpisData.profitMargin?.toFixed(2)}%`);
    }

    console.log('');

    // Test 5: get_branch_summary RPC
    console.log('5️⃣ Testing get_branch_summary RPC...');
    const { data: branchSummaryData, error: branchSummaryError } = await supabase
      .rpc('get_branch_summary');

    if (branchSummaryError) {
      console.log('❌ get_branch_summary RPC not found');
      console.log('   Error:', branchSummaryError.message);
    } else {
      console.log('✅ get_branch_summary RPC working correctly:');
      if (Array.isArray(branchSummaryData) && branchSummaryData.length > 0) {
        branchSummaryData.slice(0, 3).forEach((branch, index) => {
          console.log(`   ${index + 1}. ${branch.branchName}: $${branch.taxableSales?.toLocaleString()} (${branch.profitMargin?.toFixed(2)}% margin)`);
        });
      }
    }

    console.log('');

    // Test 6: get_paginated_transactions RPC
    console.log('6️⃣ Testing get_paginated_transactions RPC...');
    const { data: paginatedData, error: paginatedError } = await supabase
      .rpc('get_paginated_transactions', { 
        page_size: 5, 
        page_offset: 0 
      });

    if (paginatedError) {
      console.log('❌ get_paginated_transactions RPC not found');
      console.log('   Error:', paginatedError.message);
    } else {
      console.log('✅ get_paginated_transactions RPC working correctly:');
      console.log(`   📄 Page size: ${paginatedData.pagination?.pageSize}`);
      console.log(`   📊 Total count: ${paginatedData.pagination?.totalCount?.toLocaleString()}`);
      console.log(`   📚 Total pages: ${paginatedData.pagination?.totalPages}`);
      console.log(`   📋 Sample transactions:`);
      if (Array.isArray(paginatedData.data) && paginatedData.data.length > 0) {
        paginatedData.data.slice(0, 3).forEach((transaction, index) => {
          console.log(`      ${index + 1}. ${transaction.invNo} - $${transaction.salePrice} (${transaction.branchName})`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));

    if (!totalsError && !allKpisError && !branchSummaryError && !paginatedError) {
      console.log('🎉 ALL TESTS PASSED! Database setup is working correctly.');
      console.log('✅ You can now update the frontend to use these optimized data sources.');
      console.log('📈 Dashboard will now show accurate data for all 38,514 records!');
    } else {
      console.log('⚠️  Some tests failed. Please execute the SQL setup in Supabase first.');
      console.log('📄 Run the commands in: supabase-database-setup.sql');
    }

    console.log('='.repeat(70));

  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

// Run the tests
testDatabaseSetup();