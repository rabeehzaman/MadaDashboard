-- ============================================================================
-- COMPREHENSIVE SEB VEHICLE BRANCH FILTERING
-- This script filters out "SEB VEHICLE" branch from all database views and RPC functions
-- Execute this in Supabase SQL Editor to completely remove SEB VEHICLE from all data
-- ============================================================================

-- =============================================================================
-- 1. UPDATE CORE VIEWS TO EXCLUDE SEB VEHICLE
-- =============================================================================

-- Update profit_totals_view to exclude SEB VEHICLE
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
FROM profit_analysis_view_current
WHERE "Branch Name" != 'SEB VEHICLE';

-- Update profit_by_branch_view to exclude SEB VEHICLE
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
WHERE "Branch Name" != 'SEB VEHICLE'
GROUP BY "Branch Name"
ORDER BY branch_taxable_sales DESC;

-- =============================================================================
-- 2. UPDATE RPC FUNCTIONS FOR DASHBOARD KPIS
-- =============================================================================

-- Update get_dashboard_kpis function
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
  WHERE "Branch Name" != 'SEB VEHICLE'
    AND (start_date IS NULL OR "Inv Date" >= start_date)
    AND (end_date IS NULL OR "Inv Date" <= end_date);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update get_branch_summary function
CREATE OR REPLACE FUNCTION get_branch_summary(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  branch_name TEXT,
  total_revenue NUMERIC,
  total_profit NUMERIC,
  profit_margin NUMERIC,
  total_invoices BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p."Branch Name"::TEXT,
    SUM(p."SaleWithVAT") as total_revenue,
    SUM(p."Profit") as total_profit,
    CASE 
      WHEN SUM(p."SaleWithVAT") > 0 
      THEN (SUM(p."Profit") / SUM(p."SaleWithVAT")) * 100 
      ELSE 0 
    END as profit_margin,
    COUNT(DISTINCT p."Inv No") as total_invoices
  FROM profit_analysis_view_current p
  WHERE p."Branch Name" != 'SEB VEHICLE'
    AND (start_date IS NULL OR p."Inv Date" >= start_date)
    AND (end_date IS NULL OR p."Inv Date" <= end_date)
  GROUP BY p."Branch Name"
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. UPDATE ENHANCED KPI FUNCTIONS (2025 versions)
-- =============================================================================

-- Update get_dashboard_kpis_2025 function
CREATE OR REPLACE FUNCTION get_dashboard_kpis_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_revenue NUMERIC,
    total_taxable_sales NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    gross_profit_percentage NUMERIC,
    total_quantity NUMERIC,
    total_line_items BIGINT,
    total_invoices BIGINT,
    unique_customers BIGINT,
    active_branches BIGINT,
    average_order_value NUMERIC,
    earliest_transaction DATE,
    latest_transaction DATE,
    total_stock_value NUMERIC,
    gross_profit NUMERIC,
    daily_avg_sales NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(p."SaleWithVAT"), 0) as total_revenue,
        COALESCE(SUM(p."Sale Price"), 0) as total_taxable_sales,
        COALESCE(SUM(p."Cost"), 0) as total_cost,
        COALESCE(SUM(p."Profit"), 0) as total_profit,
        CASE 
            WHEN SUM(p."SaleWithVAT") > 0 
            THEN (SUM(p."Profit") / SUM(p."SaleWithVAT")) * 100 
            ELSE 0 
        END as profit_margin_percent,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as gross_profit_percentage,
        COALESCE(SUM(p."Qty"), 0) as total_quantity,
        COUNT(*) as total_line_items,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        COUNT(DISTINCT p."Customer Name") as unique_customers,
        COUNT(DISTINCT p."Branch Name") as active_branches,
        CASE 
            WHEN COUNT(DISTINCT p."Inv No") > 0 
            THEN COALESCE(SUM(p."SaleWithVAT"), 0) / COUNT(DISTINCT p."Inv No")
            ELSE 0 
        END as average_order_value,
        MIN(p."Inv Date"::DATE) as earliest_transaction,
        MAX(p."Inv Date"::DATE) as latest_transaction,
        (SELECT COALESCE(SUM("Current Stock Value"), 0) FROM zoho_stock_summary) as total_stock_value,
        COALESCE(SUM(p."Profit"), 0) as gross_profit,
        CASE 
            WHEN MAX(p."Inv Date"::DATE) IS NOT NULL AND MIN(p."Inv Date"::DATE) IS NOT NULL 
            THEN COALESCE(SUM(p."SaleWithVAT"), 0) / GREATEST((MAX(p."Inv Date"::DATE) - MIN(p."Inv Date"::DATE) + 1), 1)
            ELSE 0 
        END as daily_avg_sales
    FROM profit_analysis_view_current p
    WHERE p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. UPDATE PAGINATED DATA FUNCTIONS
-- =============================================================================

-- Update get_paginated_transactions function
CREATE OR REPLACE FUNCTION get_paginated_transactions(
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    inv_no TEXT,
    inv_date TEXT,
    item TEXT,
    qty NUMERIC,
    sale_price NUMERIC,
    sale_with_vat NUMERIC,
    cost NUMERIC,
    profit NUMERIC,
    profit_percent NUMERIC,
    customer_name TEXT,
    branch_name TEXT,
    unit_price NUMERIC,
    unit_cost NUMERIC,
    unit_profit NUMERIC,
    sales_person_name TEXT,
    invoice_status TEXT,
    total_records BIGINT
) AS $$
DECLARE
    page_offset INTEGER;
    page_limit INTEGER;
    total_records BIGINT;
BEGIN
    -- Calculate offset and limit
    page_offset := (page_num - 1) * page_size;
    page_limit := page_size;

    -- Get total record count first with filters
    SELECT COUNT(*) INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Item") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%'));

    -- Then return the paginated results with search
    RETURN QUERY
    SELECT 
        p."Inv No"::TEXT,
        p."Inv Date"::TEXT,
        p."Item"::TEXT,
        p."Qty",
        p."Sale Price",
        p."SaleWithVAT",
        p."Cost",
        p."Profit",
        p."Profit %",
        p."Customer Name"::TEXT,
        p."Branch Name"::TEXT,
        p."Unit Price",
        p."Unit Cost",
        p."Unit Profit",
        p."Sales Person Name"::TEXT,
        p."Invoice Status"::TEXT,
        total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Item") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%'))
    ORDER BY p."Inv Date"::DATE DESC, p."Inv No" DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. UPDATE PROFIT BY ITEM FUNCTIONS
-- =============================================================================

-- Update get_profit_by_item_2025 function
CREATE OR REPLACE FUNCTION get_profit_by_item_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    item TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC,
    total_records BIGINT
) AS $$
DECLARE
    page_offset INTEGER;
    page_limit INTEGER;
    total_records BIGINT;
BEGIN
    page_offset := (page_num - 1) * page_size;
    page_limit := page_size;

    -- Get total record count
    SELECT COUNT(DISTINCT p."Item") INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Item") LIKE LOWER('%' || search_query || '%'));

    -- Return paginated results
    RETURN QUERY
    SELECT 
        p."Item"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin,
        total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Item") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Item"
    ORDER BY total_profit DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Update get_profit_by_item_filtered function
CREATE OR REPLACE FUNCTION get_profit_by_item_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    item TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Item"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Item") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Item"
    ORDER BY total_profit DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. UPDATE PROFIT BY CUSTOMER FUNCTIONS
-- =============================================================================

-- Update get_profit_by_customer_2025 function
CREATE OR REPLACE FUNCTION get_profit_by_customer_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    customer_name TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC,
    total_records BIGINT
) AS $$
DECLARE
    page_offset INTEGER;
    page_limit INTEGER;
    total_records BIGINT;
BEGIN
    page_offset := (page_num - 1) * page_size;
    page_limit := page_size;

    -- Get total record count
    SELECT COUNT(DISTINCT p."Customer Name") INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'));

    -- Return paginated results
    RETURN QUERY
    SELECT 
        p."Customer Name"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin,
        total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Customer Name"
    ORDER BY total_profit DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Update get_profit_by_customer_filtered function
CREATE OR REPLACE FUNCTION get_profit_by_customer_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    customer_name TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Customer Name"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Customer Name"
    ORDER BY total_profit DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. UPDATE PROFIT BY INVOICE FUNCTIONS
-- =============================================================================

-- Update get_profit_by_invoice_2025 function
CREATE OR REPLACE FUNCTION get_profit_by_invoice_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    page_num INTEGER DEFAULT 1,
    page_size INTEGER DEFAULT 50,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    inv_no TEXT,
    inv_date TEXT,
    customer_name TEXT,
    branch_name TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC,
    total_records BIGINT
) AS $$
DECLARE
    page_offset INTEGER;
    page_limit INTEGER;
    total_records BIGINT;
BEGIN
    page_offset := (page_num - 1) * page_size;
    page_limit := page_size;

    -- Get total record count
    SELECT COUNT(DISTINCT p."Inv No") INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'));

    -- Return paginated results
    RETURN QUERY
    SELECT 
        p."Inv No"::TEXT,
        p."Inv Date"::TEXT,
        p."Customer Name"::TEXT,
        p."Branch Name"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin,
        total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Inv No", p."Inv Date", p."Customer Name", p."Branch Name"
    ORDER BY p."Inv Date"::DATE DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Update get_profit_by_invoice_filtered function
CREATE OR REPLACE FUNCTION get_profit_by_invoice_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    inv_no TEXT,
    inv_date TEXT,
    customer_name TEXT,
    branch_name TEXT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Inv No"::TEXT,
        p."Inv Date"::TEXT,
        p."Customer Name"::TEXT,
        p."Branch Name"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Inv No", p."Inv Date", p."Customer Name", p."Branch Name"
    ORDER BY p."Inv Date"::DATE DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. UPDATE CHART AND ANALYTICS FUNCTIONS
-- =============================================================================

-- Update get_daily_revenue_trend function
CREATE OR REPLACE FUNCTION get_daily_revenue_trend(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    date DATE,
    revenue NUMERIC,
    profit NUMERIC,
    transactions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Inv Date"::DATE,
        SUM(p."SaleWithVAT") as revenue,
        SUM(p."Profit") as profit,
        COUNT(DISTINCT p."Inv No") as transactions
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    GROUP BY p."Inv Date"::DATE
    ORDER BY p."Inv Date"::DATE;
END;
$$ LANGUAGE plpgsql;

-- Update get_top_selling_products function
CREATE OR REPLACE FUNCTION get_top_selling_products(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    product_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    product_name TEXT,
    total_quantity NUMERIC,
    total_revenue NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Item"::TEXT,
        SUM(p."Qty") as total_quantity,
        SUM(p."SaleWithVAT") as total_revenue,
        SUM(p."Profit") as total_profit
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    GROUP BY p."Item"
    ORDER BY total_revenue DESC
    LIMIT product_limit;
END;
$$ LANGUAGE plpgsql;

-- Update get_top_customers_chart function
CREATE OR REPLACE FUNCTION get_top_customers_chart(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    customer_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    customer_name TEXT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    total_invoices BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Customer Name"::TEXT,
        SUM(p."SaleWithVAT") as total_revenue,
        SUM(p."Profit") as total_profit,
        COUNT(DISTINCT p."Inv No") as total_invoices
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    GROUP BY p."Customer Name"
    ORDER BY total_revenue DESC
    LIMIT customer_limit;
END;
$$ LANGUAGE plpgsql;

-- Update get_branch_performance_chart function
CREATE OR REPLACE FUNCTION get_branch_performance_chart(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    branch_name TEXT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC,
    total_invoices BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Branch Name"::TEXT,
        SUM(p."SaleWithVAT") as total_revenue,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."SaleWithVAT") > 0 
            THEN (SUM(p."Profit") / SUM(p."SaleWithVAT")) * 100 
            ELSE 0 
        END as profit_margin,
        COUNT(DISTINCT p."Inv No") as total_invoices
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
    GROUP BY p."Branch Name"
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Update get_monthly_revenue_comparison function
CREATE OR REPLACE FUNCTION get_monthly_revenue_comparison(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    month_year TEXT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(p."Inv Date"::DATE, 'YYYY-MM') as month_year,
        SUM(p."SaleWithVAT") as total_revenue,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."SaleWithVAT") > 0 
            THEN (SUM(p."Profit") / SUM(p."SaleWithVAT")) * 100 
            ELSE 0 
        END as profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    GROUP BY TO_CHAR(p."Inv Date"::DATE, 'YYYY-MM')
    ORDER BY month_year;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. UPDATE FILTER OPTION FUNCTIONS
-- =============================================================================

-- Update get_item_filter_options_2025 function
CREATE OR REPLACE FUNCTION get_item_filter_options_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    item_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p."Item"::TEXT
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND p."Item" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Item"::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update get_customer_filter_options_2025 function
CREATE OR REPLACE FUNCTION get_customer_filter_options_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    customer_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p."Customer Name"::TEXT
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND p."Customer Name" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Customer Name"::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Update get_invoice_filter_options_2025 function
CREATE OR REPLACE FUNCTION get_invoice_filter_options_2025(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    invoice_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p."Inv No"::TEXT
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND p."Inv No" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Inv No"::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. UPDATE TOTALS FUNCTIONS
-- =============================================================================

-- Update get_profit_by_item_totals function
CREATE OR REPLACE FUNCTION get_profit_by_item_totals(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_records BIGINT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    avg_profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p."Item") as total_records,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as avg_profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR LOWER(p."Item") LIKE LOWER('%' || search_query || '%'));
END;
$$ LANGUAGE plpgsql;

-- Update get_profit_by_invoice_totals function
CREATE OR REPLACE FUNCTION get_profit_by_invoice_totals(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_records BIGINT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    avg_profit_margin NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p."Inv No") as total_records,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as avg_profit_margin
    FROM profit_analysis_view_current p
    WHERE 
        p."Branch Name" != 'SEB VEHICLE'
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'));
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

-- Create a function to confirm the filtering is working
CREATE OR REPLACE FUNCTION verify_seb_vehicle_filtering()
RETURNS TABLE(
    test_name TEXT,
    seb_vehicle_count BIGINT,
    total_count BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Test 1: Check profit_totals_view excludes SEB VEHICLE
    SELECT 
        'profit_totals_view test'::TEXT,
        (SELECT COUNT(*) FROM profit_analysis_view_current WHERE "Branch Name" = 'SEB VEHICLE') as seb_vehicle_count,
        (SELECT branch_count FROM profit_totals_view) as total_count,
        CASE 
            WHEN (SELECT branch_count FROM profit_totals_view) < (SELECT COUNT(DISTINCT "Branch Name") FROM profit_analysis_view_current) 
            THEN 'PASS - SEB VEHICLE excluded'::TEXT
            ELSE 'FAIL - SEB VEHICLE still included'::TEXT
        END as status
    
    UNION ALL
    
    -- Test 2: Check branch list excludes SEB VEHICLE
    SELECT 
        'branch_list test'::TEXT,
        1::BIGINT,
        (SELECT COUNT(*) FROM profit_by_branch_view WHERE branch_name = 'SEB VEHICLE') as total_count,
        CASE 
            WHEN (SELECT COUNT(*) FROM profit_by_branch_view WHERE branch_name = 'SEB VEHICLE') = 0
            THEN 'PASS - SEB VEHICLE excluded from branches'::TEXT
            ELSE 'FAIL - SEB VEHICLE still in branches'::TEXT
        END as status;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCRIPT COMPLETION
-- ============================================================================
-- This script has updated all major database views and RPC functions to exclude
-- the "SEB VEHICLE" branch. Run verify_seb_vehicle_filtering() to confirm.
-- 
-- To test: SELECT * FROM verify_seb_vehicle_filtering();
-- ============================================================================