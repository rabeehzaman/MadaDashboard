-- =============================================================================
-- PAGINATION AND SEARCH FIX FOR RPC FUNCTIONS
-- =============================================================================
-- This adds proper search functionality to RPC functions and fixes stock value
-- =============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_profit_by_item_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_profit_by_invoice_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;

-- =============================================================================
-- ENHANCED: GET PROFIT BY ITEM FILTERED (with search support)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_item_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    page_limit INTEGER DEFAULT 25,
    page_offset INTEGER DEFAULT 0
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
    total_count BIGINT
) AS $$
DECLARE
    total_records BIGINT;
BEGIN
    -- First get the total count with all filters
    SELECT COUNT(*) INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
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
        p."Inv Date" IS NOT NULL
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
-- ENHANCED: GET PROFIT BY INVOICE FILTERED (with search support)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_invoice_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL,
    page_limit INTEGER DEFAULT 25,
    page_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    invoice_no TEXT,
    inv_date TEXT,
    customer_name TEXT,
    branch_name TEXT,
    line_items_count BIGINT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_sale_with_vat NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    total_count BIGINT
) AS $$
DECLARE
    total_records BIGINT;
BEGIN
    -- First get the total count of invoices with search
    SELECT COUNT(DISTINCT p."Inv No") INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL 
        AND p."Inv No" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%'));

    -- Then return the paginated invoice aggregations with search
    RETURN QUERY
    SELECT 
        p."Inv No"::TEXT as invoice_no,
        p."Inv Date"::TEXT as inv_date,
        COALESCE(p."Customer Name", 'Unknown')::TEXT as customer_name,
        p."Branch Name"::TEXT as branch_name,
        COUNT(*) as line_items_count,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."SaleWithVAT") as total_sale_with_vat,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100
            ELSE 0
        END as profit_margin_percent,
        total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL 
        AND p."Inv No" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%') OR
             LOWER(p."Inv No") LIKE LOWER('%' || search_query || '%'))
    GROUP BY p."Inv No", p."Inv Date", p."Customer Name", p."Branch Name"
    ORDER BY p."Inv Date"::DATE DESC, invoice_no DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- ENHANCED: GET PROFIT BY CUSTOMER FILTERED (with search support)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_customer_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    customer_name TEXT,
    total_invoices BIGINT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_sale_with_vat NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    first_transaction_date DATE,
    last_transaction_date DATE,
    total_line_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p."Customer Name", 'Unknown')::TEXT as customer_name,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."SaleWithVAT") as total_sale_with_vat,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100
            ELSE 0
        END as profit_margin_percent,
        MIN(p."Inv Date"::DATE) as first_transaction_date,
        MAX(p."Inv Date"::DATE) as last_transaction_date,
        COUNT(*) as total_line_items
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (search_query IS NULL OR 
             LOWER(p."Customer Name") LIKE LOWER('%' || search_query || '%'))
    GROUP BY COALESCE(p."Customer Name", 'Unknown')
    ORDER BY total_profit DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIX STOCK VALUE CONSISTENCY
-- =============================================================================
-- Update the KPI function to use the same calculation as the stock table

-- First, let's update the dashboard KPIs function to use consistent stock calculation
CREATE OR REPLACE FUNCTION get_dashboard_kpis(
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
        -- Revenue metrics
        SUM(p."SaleWithVAT") as total_revenue,
        SUM(p."Sale Price") as total_taxable_sales,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit,
        
        -- Calculated metrics
        CASE 
            WHEN SUM(p."SaleWithVAT") > 0 THEN (SUM(p."Profit") / SUM(p."SaleWithVAT")) * 100
            ELSE 0
        END as profit_margin_percent,
        
        CASE 
            WHEN SUM(p."Sale Price") > 0 THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100
            ELSE 0
        END as gross_profit_percentage,
        
        -- Volume metrics
        SUM(p."Qty") as total_quantity,
        COUNT(*) as total_line_items,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        COUNT(DISTINCT p."Customer Name") as unique_customers,
        COUNT(DISTINCT p."Branch Name") as active_branches,
        
        -- Average metrics
        CASE 
            WHEN COUNT(DISTINCT p."Inv No") > 0 THEN SUM(p."SaleWithVAT") / COUNT(DISTINCT p."Inv No")
            ELSE 0
        END as average_order_value,
        
        -- Date range
        MIN(p."Inv Date"::DATE) as earliest_transaction,
        MAX(p."Inv Date"::DATE) as latest_transaction,
        
        -- Stock metrics (FIXED: Use same calculation as stock_report_view)
        (SELECT SUM(s."Stock Value with VAT") 
         FROM zoho_stock_summary s 
         WHERE s."Name" IS NOT NULL) as total_stock_value,
        
        -- Gross profit (Sale Price - Cost)
        SUM(p."Sale Price") - SUM(p."Cost") as gross_profit,
        
        -- Daily average based on actual date range
        CASE 
            WHEN start_date IS NOT NULL AND end_date IS NOT NULL 
            THEN CASE 
                WHEN end_date > start_date 
                THEN SUM(p."Sale Price") / (end_date - start_date + 1)
                ELSE SUM(p."Sale Price")
            END
            ELSE CASE 
                WHEN MAX(p."Inv Date")::DATE > MIN(p."Inv Date")::DATE 
                THEN SUM(p."Sale Price") / (MAX(p."Inv Date")::DATE - MIN(p."Inv Date")::DATE + 1)
                ELSE SUM(p."Sale Price")
            END
        END as daily_avg_sales
        
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TEST QUERIES
-- =============================================================================

-- Test profit by item with search
-- SELECT * FROM get_profit_by_item_filtered(NULL, NULL, NULL, 'BISKREM', 5, 0);

-- Test profit by invoice with search  
-- SELECT * FROM get_profit_by_invoice_filtered(NULL, NULL, NULL, 'Customer A', 5, 0);

-- Test profit by customer with search
-- SELECT * FROM get_profit_by_customer_filtered(NULL, NULL, NULL, 'Customer');

-- Test KPIs (stock value should now match table)
-- SELECT total_stock_value FROM get_dashboard_kpis(NULL, NULL, NULL);

-- Compare with stock table total:
-- SELECT SUM("Stock Value with VAT") FROM zoho_stock_summary WHERE "Name" IS NOT NULL;