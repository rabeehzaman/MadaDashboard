const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://tqsltmruwqluaeukgrbd.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxc2x0bXJ1d3FsdWFldWtncmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzMwMTM5MSwiZXhwIjoyMDY4ODc3MzkxfQ.LxHJvXC7IcORus2pAouzJuRqYU5xCpjpHkpXE1an5g0';

// Create Supabase client with service key
const supabase = createClient(supabaseUrl, serviceKey);

async function createDatabaseObjects() {
  console.log('🚀 Starting database setup for dashboard optimization...\n');

  try {
    // 1. Create aggregated totals view
    console.log('📊 Creating profit_totals_view...');
    const totalViewSQL = `
      CREATE OR REPLACE VIEW profit_totals_view AS
      SELECT 
        SUM("Sale Price") as total_taxable_sales,
        SUM("SaleWithVAT") as total_revenue,
        SUM("Cost") as total_cost,
        SUM("Profit") as total_profit,
        COUNT(*) as total_invoices,
        COUNT(DISTINCT "Inv No") as unique_invoices,
        COUNT(DISTINCT "Branch Name") as branch_count,
        AVG("Sale Price") as avg_sale_price,
        AVG("Profit %") as avg_profit_margin,
        CASE 
          WHEN SUM("SaleWithVAT") > 0 
          THEN (SUM("Profit") / SUM("SaleWithVAT")) * 100 
          ELSE 0 
        END as overall_profit_margin
      FROM profit_analysis_view_current;
    `;

    const { error: totalViewError } = await supabase.rpc('execute_sql', { 
      sql_query: totalViewSQL 
    });

    if (totalViewError && !totalViewError.message.includes('does not exist')) {
      console.error('❌ Error creating profit_totals_view:', totalViewError);
    } else {
      console.log('✅ profit_totals_view created successfully');
    }

    // 2. Create branch summary view
    console.log('🏢 Creating profit_by_branch_view...');
    const branchViewSQL = `
      CREATE OR REPLACE VIEW profit_by_branch_view AS
      SELECT 
        "Branch Name" as branch_name,
        SUM("Sale Price") as branch_taxable_sales,
        SUM("SaleWithVAT") as branch_revenue,
        SUM("Cost") as branch_cost,
        SUM("Profit") as branch_profit,
        COUNT(*) as branch_invoices,
        COUNT(DISTINCT "Inv No") as unique_branch_invoices,
        AVG("Sale Price") as avg_branch_sale_price,
        CASE 
          WHEN SUM("SaleWithVAT") > 0 
          THEN (SUM("Profit") / SUM("SaleWithVAT")) * 100 
          ELSE 0 
        END as branch_profit_margin,
        MIN("Inv Date") as first_transaction_date,
        MAX("Inv Date") as last_transaction_date
      FROM profit_analysis_view_current
      GROUP BY "Branch Name"
      ORDER BY branch_taxable_sales DESC;
    `;

    const { error: branchViewError } = await supabase.rpc('execute_sql', { 
      sql_query: branchViewSQL 
    });

    if (branchViewError && !branchViewError.message.includes('does not exist')) {
      console.error('❌ Error creating profit_by_branch_view:', branchViewError);
    } else {
      console.log('✅ profit_by_branch_view created successfully');
    }

    // 3. Create RPC function for date-filtered KPIs
    console.log('📅 Creating get_dashboard_kpis RPC function...');
    const kpisFunctionSQL = `
      CREATE OR REPLACE FUNCTION get_dashboard_kpis(
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL
      )
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'totalTaxableSales', COALESCE(SUM("Sale Price"), 0),
          'totalRevenue', COALESCE(SUM("SaleWithVAT"), 0),
          'totalCost', COALESCE(SUM("Cost"), 0),
          'totalProfit', COALESCE(SUM("Profit"), 0),
          'totalInvoices', COUNT(*),
          'uniqueInvoices', COUNT(DISTINCT "Inv No"),
          'totalQuantity', COALESCE(SUM("Qty"), 0),
          'averageOrderValue', CASE 
            WHEN COUNT(DISTINCT "Inv No") > 0 
            THEN COALESCE(SUM("SaleWithVAT"), 0) / COUNT(DISTINCT "Inv No")
            ELSE 0 
          END,
          'profitMargin', CASE 
            WHEN SUM("SaleWithVAT") > 0 
            THEN (SUM("Profit") / SUM("SaleWithVAT")) * 100 
            ELSE 0 
          END,
          'dateRange', json_build_object(
            'from', start_date,
            'to', end_date,
            'actualFrom', MIN("Inv Date"),
            'actualTo', MAX("Inv Date")
          )
        ) INTO result
        FROM profit_analysis_view_current
        WHERE (start_date IS NULL OR "Inv Date" >= start_date)
          AND (end_date IS NULL OR "Inv Date" <= end_date);
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: kpisFunctionError } = await supabase.rpc('execute_sql', { 
      sql_query: kpisFunctionSQL 
    });

    if (kpisFunctionError && !kpisFunctionError.message.includes('does not exist')) {
      console.error('❌ Error creating get_dashboard_kpis function:', kpisFunctionError);
    } else {
      console.log('✅ get_dashboard_kpis RPC function created successfully');
    }

    // 4. Create RPC function for branch summary with date filtering
    console.log('🏢 Creating get_branch_summary RPC function...');
    const branchSummarySQL = `
      CREATE OR REPLACE FUNCTION get_branch_summary(
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL
      )
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_agg(
          json_build_object(
            'branchName', "Branch Name",
            'taxableSales', COALESCE(SUM("Sale Price"), 0),
            'revenue', COALESCE(SUM("SaleWithVAT"), 0),
            'cost', COALESCE(SUM("Cost"), 0),
            'profit', COALESCE(SUM("Profit"), 0),
            'invoices', COUNT(*),
            'uniqueInvoices', COUNT(DISTINCT "Inv No"),
            'profitMargin', CASE 
              WHEN SUM("SaleWithVAT") > 0 
              THEN (SUM("Profit") / SUM("SaleWithVAT")) * 100 
              ELSE 0 
            END,
            'averageOrderValue', CASE 
              WHEN COUNT(DISTINCT "Inv No") > 0 
              THEN COALESCE(SUM("SaleWithVAT"), 0) / COUNT(DISTINCT "Inv No")
              ELSE 0 
            END
          )
        ) INTO result
        FROM profit_analysis_view_current
        WHERE (start_date IS NULL OR "Inv Date" >= start_date)
          AND (end_date IS NULL OR "Inv Date" <= end_date)
        GROUP BY "Branch Name"
        ORDER BY SUM("Sale Price") DESC;
        
        RETURN COALESCE(result, '[]'::json);
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: branchSummaryError } = await supabase.rpc('execute_sql', { 
      sql_query: branchSummarySQL 
    });

    if (branchSummaryError && !branchSummaryError.message.includes('does not exist')) {
      console.error('❌ Error creating get_branch_summary function:', branchSummaryError);
    } else {
      console.log('✅ get_branch_summary RPC function created successfully');
    }

    console.log('\n🎉 Database setup completed! Testing the new functions...\n');

    // Test the functions
    await testNewFunctions();

  } catch (error) {
    console.error('💥 Error during database setup:', error);
  }
}

async function testNewFunctions() {
  try {
    console.log('🧪 Testing profit_totals_view...');
    const { data: totalsData, error: totalsError } = await supabase
      .from('profit_totals_view')
      .select('*')
      .single();

    if (totalsError) {
      console.error('❌ Error testing profit_totals_view:', totalsError);
    } else {
      console.log('✅ profit_totals_view test successful:');
      console.log(`   💰 Total Taxable Sales: $${totalsData.total_taxable_sales?.toLocaleString()}`);
      console.log(`   📊 Total Invoices: ${totalsData.total_invoices?.toLocaleString()}`);
      console.log(`   📈 Profit Margin: ${totalsData.overall_profit_margin?.toFixed(2)}%`);
    }

    console.log('\n🧪 Testing get_dashboard_kpis RPC...');
    const { data: kpisData, error: kpisError } = await supabase
      .rpc('get_dashboard_kpis');

    if (kpisError) {
      console.error('❌ Error testing get_dashboard_kpis:', kpisError);
    } else {
      console.log('✅ get_dashboard_kpis RPC test successful:');
      console.log(`   💰 Total Taxable Sales: $${kpisData.totalTaxableSales?.toLocaleString()}`);
      console.log(`   📊 Total Invoices: ${kpisData.totalInvoices?.toLocaleString()}`);
      console.log(`   📈 Profit Margin: ${kpisData.profitMargin?.toFixed(2)}%`);
    }

    console.log('\n🧪 Testing get_branch_summary RPC...');
    const { data: branchData, error: branchError } = await supabase
      .rpc('get_branch_summary');

    if (branchError) {
      console.error('❌ Error testing get_branch_summary:', branchError);
    } else {
      console.log('✅ get_branch_summary RPC test successful:');
      if (Array.isArray(branchData) && branchData.length > 0) {
        console.log(`   🏢 Found ${branchData.length} branches`);
        branchData.slice(0, 3).forEach((branch, index) => {
          console.log(`   ${index + 1}. ${branch.branchName}: $${branch.taxableSales?.toLocaleString()}`);
        });
      }
    }

    console.log('\n🎯 All database objects created and tested successfully!');
    console.log('📋 Next step: Update frontend to use these new data sources');

  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run the setup
createDatabaseObjects();