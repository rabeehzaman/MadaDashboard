-- ============================================================================
-- MADA DASHBOARD DATABASE OPTIMIZATION SETUP
-- Execute these commands in Supabase SQL Editor to fix the 1000-record limit
-- ============================================================================

-- 1. CREATE AGGREGATED TOTALS VIEW
-- This view pre-calculates all totals for instant KPI loading
-- ============================================================================
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

-- 2. CREATE BRANCH SUMMARY VIEW
-- This view provides branch-wise aggregated data
-- ============================================================================
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

-- 3. CREATE RPC FUNCTION FOR DATE-FILTERED KPIS
-- This function calculates KPIs for specific date ranges
-- ============================================================================
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

-- 4. CREATE RPC FUNCTION FOR BRANCH SUMMARY WITH DATE FILTERING
-- This function provides branch-wise data for specific date ranges
-- ============================================================================
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

-- 5. CREATE RPC FUNCTION FOR PAGINATED DETAIL DATA
-- This function provides paginated access to detailed records
-- ============================================================================
CREATE OR REPLACE FUNCTION get_paginated_transactions(
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  branch_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_count INTEGER;
BEGIN
  -- Get total count for pagination info
  SELECT COUNT(*) INTO total_count
  FROM profit_analysis_view_current
  WHERE (start_date IS NULL OR "Inv Date" >= start_date)
    AND (end_date IS NULL OR "Inv Date" <= end_date)
    AND (branch_filter IS NULL OR "Branch Name" = branch_filter);

  -- Get paginated data
  SELECT json_build_object(
    'data', json_agg(
      json_build_object(
        'invNo', "Inv No",
        'invDate', "Inv Date",
        'item', "Item",
        'qty', "Qty",
        'salePrice', "Sale Price",
        'saleWithVAT', "SaleWithVAT",
        'cost', "Cost",
        'profit', "Profit",
        'profitPercent', "Profit %",
        'customerName', "Customer Name",
        'branchName', "Branch Name",
        'salesPersonName', "Sales Person Name",
        'invoiceStatus', "Invoice Status"
      )
    ),
    'pagination', json_build_object(
      'totalCount', total_count,
      'pageSize', page_size,
      'currentOffset', page_offset,
      'hasMore', (page_offset + page_size) < total_count,
      'totalPages', CEIL(total_count::FLOAT / page_size)
    )
  ) INTO result
  FROM (
    SELECT *
    FROM profit_analysis_view_current
    WHERE (start_date IS NULL OR "Inv Date" >= start_date)
      AND (end_date IS NULL OR "Inv Date" <= end_date)
      AND (branch_filter IS NULL OR "Branch Name" = branch_filter)
    ORDER BY "Inv Date" DESC, "Inv No" DESC
    LIMIT page_size
    OFFSET page_offset
  ) paginated_data;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. CREATE RPC FUNCTION FOR CHART DATA
-- This function provides aggregated daily data for charts
-- ============================================================================
CREATE OR REPLACE FUNCTION get_chart_data(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  group_by_period TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  date_format TEXT;
BEGIN
  -- Set date grouping format based on period
  CASE group_by_period
    WHEN 'week' THEN date_format := 'YYYY-IW';
    WHEN 'month' THEN date_format := 'YYYY-MM';
    ELSE date_format := 'YYYY-MM-DD';
  END CASE;

  SELECT json_build_object(
    'revenueChart', revenue_data,
    'profitChart', profit_data,
    'marginChart', margin_data,
    'dateRange', json_build_object(
      'from', start_date,
      'to', end_date,
      'actualFrom', MIN("Inv Date"),
      'actualTo', MAX("Inv Date")
    )
  ) INTO result
  FROM (
    SELECT 
      json_agg(
        json_build_object(
          'date', grouped_date,
          'value', daily_revenue,
          'label', 'Revenue'
        ) ORDER BY grouped_date
      ) as revenue_data,
      json_agg(
        json_build_object(
          'date', grouped_date,
          'value', daily_profit,
          'label', 'Profit'
        ) ORDER BY grouped_date
      ) as profit_data,
      json_agg(
        json_build_object(
          'date', grouped_date,
          'value', CASE 
            WHEN daily_revenue > 0 
            THEN (daily_profit / daily_revenue) * 100 
            ELSE 0 
          END,
          'label', 'Margin %'
        ) ORDER BY grouped_date
      ) as margin_data
    FROM (
      SELECT 
        TO_CHAR("Inv Date", date_format) as grouped_date,
        SUM("SaleWithVAT") as daily_revenue,
        SUM("Profit") as daily_profit
      FROM profit_analysis_view_current
      WHERE (start_date IS NULL OR "Inv Date" >= start_date)
        AND (end_date IS NULL OR "Inv Date" <= end_date)
        AND "Inv Date" IS NOT NULL
      GROUP BY TO_CHAR("Inv Date", date_format)
      ORDER BY grouped_date
    ) daily_aggregates
  ) chart_arrays;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES - Run these to test the setup
-- ============================================================================

-- Test 1: Check aggregated totals view
-- SELECT * FROM profit_totals_view;

-- Test 2: Check branch summary view
-- SELECT * FROM profit_by_branch_view LIMIT 5;

-- Test 3: Test KPIs function (all data)
-- SELECT get_dashboard_kpis();

-- Test 4: Test KPIs function with date filter
-- SELECT get_dashboard_kpis('2024-01-01', '2024-12-31');

-- Test 5: Test branch summary function
-- SELECT get_branch_summary();

-- Test 6: Test paginated transactions
-- SELECT get_paginated_transactions(10, 0);

-- Test 7: Test chart data function (all data)
-- SELECT get_chart_data();

-- Test 8: Test chart data function with date filter
-- SELECT get_chart_data('2024-01-01', '2024-12-31', 'day');

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- After running these commands, you should see:
-- 1. profit_totals_view showing ~$4.7M total taxable sales
-- 2. profit_by_branch_view showing 7 branches with Main Branch having highest sales
-- 3. RPC functions returning JSON with accurate totals for all 38,514 records
-- 4. get_chart_data() returning daily aggregated data for trend charts
-- ============================================================================