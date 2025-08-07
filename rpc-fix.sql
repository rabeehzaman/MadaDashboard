-- =============================================================================
-- FIX FOR PROFIT BY ITEM AND INVOICE RPC FUNCTIONS
-- =============================================================================
-- The issue is likely with the total_count window function causing empty results
-- Let's create simpler versions that work reliably
-- =============================================================================

-- Drop and recreate the problematic RPC functions
DROP FUNCTION IF EXISTS get_profit_by_item_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_profit_by_invoice_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;

-- =============================================================================
-- FIXED: GET PROFIT BY ITEM FILTERED (simplified version)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_item_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
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
    -- First get the total count
    SELECT COUNT(*) INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);

    -- Then return the paginated results with the total count
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
    ORDER BY p."Inv Date"::DATE DESC, p."Inv No" DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIXED: GET PROFIT BY INVOICE FILTERED (simplified version)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_invoice_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
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
    -- First get the total count of invoices
    SELECT COUNT(DISTINCT p."Inv No") INTO total_records
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL 
        AND p."Inv No" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);

    -- Then return the paginated invoice aggregations
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
    GROUP BY p."Inv No", p."Inv Date", p."Customer Name", p."Branch Name"
    ORDER BY p."Inv Date"::DATE DESC, invoice_no DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TEST QUERIES - Run these to verify the functions work
-- =============================================================================

-- Test profit by item (should return data)
-- SELECT * FROM get_profit_by_item_filtered(NULL, NULL, NULL, 5, 0);

-- Test profit by invoice (should return data)
-- SELECT * FROM get_profit_by_invoice_filtered(NULL, NULL, NULL, 5, 0);

-- =============================================================================
-- NOTES FOR DEBUGGING
-- =============================================================================
-- If these still don't work, check:
-- 1. Does profit_analysis_view_current have data? SELECT COUNT(*) FROM profit_analysis_view_current;
-- 2. Are the column names correct? SELECT * FROM profit_analysis_view_current LIMIT 1;
-- 3. Check for NULL values in key columns