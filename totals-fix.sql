-- =============================================================================
-- TOTALS FIX - Separate functions to get accurate totals
-- =============================================================================
-- These functions return only the totals, not the paginated data
-- This allows us to show accurate totals even when showing partial data
-- =============================================================================

-- =============================================================================
-- GET PROFIT BY ITEM TOTALS (for accurate totals display)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_item_totals(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_records BIGINT,
    total_qty NUMERIC,
    total_sale_price NUMERIC,
    total_sale_with_vat NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_records,
        SUM(p."Qty") as total_qty,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."SaleWithVAT") as total_sale_with_vat,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit
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
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GET PROFIT BY INVOICE TOTALS (for accurate totals display)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_invoice_totals(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL,
    search_query TEXT DEFAULT NULL
)
RETURNS TABLE(
    total_invoices BIGINT,
    total_line_items BIGINT,
    total_quantity NUMERIC,
    total_sale_price NUMERIC,
    total_sale_with_vat NUMERIC,
    total_cost NUMERIC,
    total_profit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p."Inv No") as total_invoices,
        COUNT(*) as total_line_items,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price") as total_sale_price,
        SUM(p."SaleWithVAT") as total_sale_with_vat,
        SUM(p."Cost") as total_cost,
        SUM(p."Profit") as total_profit
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
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GET FILTER OPTIONS (for dropdown filters)
-- =============================================================================

-- Get all unique items for dropdown filter
CREATE OR REPLACE FUNCTION get_item_filter_options(
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
        p."Item" as item_name
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND p."Item" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Item" ASC;
END;
$$ LANGUAGE plpgsql;

-- Get all unique customers for dropdown filter
CREATE OR REPLACE FUNCTION get_customer_filter_options(
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
        COALESCE(p."Customer Name", 'Unknown') as customer_name
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY customer_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Get all unique invoice numbers for dropdown filter
CREATE OR REPLACE FUNCTION get_invoice_filter_options(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
    invoice_no TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p."Inv No" as invoice_no
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND p."Inv No" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Inv No" ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TEST QUERIES
-- =============================================================================

-- Test totals functions
-- SELECT * FROM get_profit_by_item_totals(NULL, NULL, NULL, NULL);
-- SELECT * FROM get_profit_by_invoice_totals(NULL, NULL, NULL, NULL);

-- Test filter options
-- SELECT * FROM get_item_filter_options(NULL, NULL, NULL) LIMIT 10;
-- SELECT * FROM get_customer_filter_options(NULL, NULL, NULL) LIMIT 10;
-- SELECT * FROM get_invoice_filter_options(NULL, NULL, NULL) LIMIT 10;