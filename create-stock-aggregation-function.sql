-- =============================================================================
-- STOCK REPORT AGGREGATION FUNCTION
-- =============================================================================
-- This function returns aggregated stock data when no warehouse filter is applied
-- and individual warehouse data when a specific warehouse is selected
-- =============================================================================

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_stock_report_aggregated(TEXT);

-- Create the new aggregated stock report function
CREATE OR REPLACE FUNCTION get_stock_report_aggregated(warehouse_filter TEXT DEFAULT NULL)
RETURNS TABLE (
    product_name TEXT,
    warehouse TEXT,
    unit TEXT,
    stock_quantity NUMERIC,
    stock_in_pieces NUMERIC,
    current_stock_value NUMERIC,
    stock_value_with_vat NUMERIC,
    unit_cost NUMERIC,
    vat_amount NUMERIC
) AS $$
BEGIN
    IF warehouse_filter IS NULL OR warehouse_filter = '' THEN
        -- When no warehouse filter, aggregate by product name
        RETURN QUERY
        SELECT
            s."Name"::TEXT as product_name,
            'All Warehouses'::TEXT as warehouse,
            MAX(s."Unit")::TEXT as unit,  -- Units should be same for all warehouses
            SUM(s."Stock Qty") as stock_quantity,
            SUM(s."Stock in Pieces") as stock_in_pieces,
            SUM(s."Current Stock Value") as current_stock_value,
            SUM(s."Stock Value with VAT") as stock_value_with_vat,
            -- Calculate weighted average unit cost
            CASE
                WHEN SUM(s."Stock Qty") > 0 AND SUM(s."Stock Qty") IS NOT NULL THEN
                    SUM(s."Current Stock Value") / SUM(s."Stock Qty")
                ELSE 0
            END as unit_cost,
            SUM(s."Stock Value with VAT" - s."Current Stock Value") as vat_amount
        FROM zoho_stock_summary s
        WHERE s."Name" IS NOT NULL
            AND s."Warehouse" IS NOT NULL
        GROUP BY s."Name"
        ORDER BY s."Name";
    ELSE
        -- When warehouse filter is specified, return data for that warehouse only
        RETURN QUERY
        SELECT
            s."Name"::TEXT as product_name,
            s."Warehouse"::TEXT as warehouse,
            s."Unit"::TEXT as unit,
            s."Stock Qty" as stock_quantity,
            s."Stock in Pieces" as stock_in_pieces,
            s."Current Stock Value" as current_stock_value,
            s."Stock Value with VAT" as stock_value_with_vat,
            CASE
                WHEN s."Stock Qty" > 0 AND s."Stock Qty" IS NOT NULL THEN
                    s."Current Stock Value" / s."Stock Qty"
                ELSE 0
            END as unit_cost,
            (s."Stock Value with VAT" - s."Current Stock Value") as vat_amount
        FROM zoho_stock_summary s
        WHERE s."Name" IS NOT NULL
            AND s."Warehouse" IS NOT NULL
            AND s."Warehouse" = warehouse_filter
        ORDER BY s."Name";
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_stock_report_aggregated(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_report_aggregated(TEXT) TO anon;

-- Test queries to verify the function works correctly
-- Uncomment these to test after creating the function:

/*
-- Test 1: Get aggregated data (all warehouses)
SELECT * FROM get_stock_report_aggregated(NULL) LIMIT 10;

-- Test 2: Get data for a specific warehouse
-- (replace 'Warehouse Name' with an actual warehouse name from your data)
SELECT * FROM get_stock_report_aggregated('Warehouse Name') LIMIT 10;

-- Test 3: Compare totals
SELECT
    'Individual Warehouses' as view_type,
    COUNT(DISTINCT "Name") as unique_products,
    COUNT(*) as total_rows,
    SUM("Stock Qty") as total_stock_qty,
    SUM("Current Stock Value") as total_value
FROM zoho_stock_summary
WHERE "Name" IS NOT NULL AND "Warehouse" IS NOT NULL
UNION ALL
SELECT
    'Aggregated' as view_type,
    COUNT(*) as unique_products,
    COUNT(*) as total_rows,
    SUM(stock_quantity) as total_stock_qty,
    SUM(current_stock_value) as total_value
FROM get_stock_report_aggregated(NULL);
*/