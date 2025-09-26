-- =============================================================================
-- EXCLUDE SPECIFIC WAREHOUSES FROM ALL STOCK VIEWS AND FUNCTIONS
-- =============================================================================
-- This migration excludes these warehouses from all stock-related queries:
-- 1. DACTVTD wh(shahid)
-- 2. Jamsheed WH
-- 3. MAJEED
-- 4. SEB VEHICLE WH
-- =============================================================================

-- 1. Update stock_report_view to exclude unwanted warehouses
DROP VIEW IF EXISTS stock_report_view CASCADE;
CREATE VIEW stock_report_view AS
SELECT
    "Name" AS product_name,
    "Warehouse" AS warehouse,
    "Unit" AS unit,
    "Stock Qty" AS stock_quantity,
    ("Stock in Pieces")::integer AS stock_in_pieces,
    "Current Stock Value" AS current_stock_value,
    "Stock Value with VAT" AS stock_value_with_vat,
    CASE
        WHEN "Stock Qty" <> 0 THEN round(("Current Stock Value" / "Stock Qty"), 2)
        ELSE 0
    END AS unit_cost,
    round(("Stock Value with VAT" - "Current Stock Value"), 2) AS vat_amount
FROM zoho_stock_summary
WHERE "Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH');

-- 2. Update dashboard_kpis_view to exclude warehouses
DROP VIEW IF EXISTS dashboard_kpis_view CASCADE;
CREATE VIEW dashboard_kpis_view AS
SELECT
    COALESCE(sum(
        CASE
            WHEN ("Current Stock Value" > 0) THEN "Current Stock Value"
            ELSE 0
        END), 0) AS total_positive_stock_value,
    COALESCE(sum("Current Stock Value"), 0) AS total_stock_value_with_negatives,
    count(*) AS total_stock_items,
    count(
        CASE
            WHEN ("Stock Qty" < 0) THEN 1
            ELSE NULL
        END) AS negative_stock_items,
    count(
        CASE
            WHEN ("Stock Qty" > 0) THEN 1
            ELSE NULL
        END) AS positive_stock_items,
    COALESCE(sum(
        CASE
            WHEN ("Stock Qty" < 0) THEN "Current Stock Value"
            ELSE 0
        END), 0) AS negative_stock_value
FROM zoho_stock_summary
WHERE "Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH');

-- 3. Update get_stock_report_aggregated function
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
        -- Only show items where the total quantity across all warehouses is not zero
        RETURN QUERY
        SELECT
            s."Name"::TEXT as product_name,
            'All Warehouses'::TEXT as warehouse,
            MAX(s."Unit")::TEXT as unit,
            SUM(s."Stock Qty") as stock_quantity,
            SUM(s."Stock in Pieces") as stock_in_pieces,
            SUM(s."Current Stock Value") as current_stock_value,
            SUM(s."Stock Value with VAT") as stock_value_with_vat,
            CASE
                WHEN SUM(s."Stock Qty") > 0 AND SUM(s."Stock Qty") IS NOT NULL THEN
                    SUM(s."Current Stock Value") / SUM(s."Stock Qty")
                ELSE 0
            END as unit_cost,
            SUM(s."Stock Value with VAT" - s."Current Stock Value") as vat_amount
        FROM zoho_stock_summary s
        WHERE s."Name" IS NOT NULL
            AND s."Warehouse" IS NOT NULL
            AND s."Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH')
        GROUP BY s."Name"
        HAVING SUM(s."Stock Qty") != 0  -- Exclude items where total quantity is zero
        ORDER BY s."Name";
    ELSE
        -- When warehouse filter is specified, return data for that warehouse only
        -- Exclude items where the quantity for this specific warehouse is zero
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
            AND s."Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH')
            AND s."Stock Qty" != 0  -- Exclude items with zero quantity
        ORDER BY s."Name";
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update get_warehouse_filter_options function
CREATE OR REPLACE FUNCTION get_warehouse_filter_options()
RETURNS TABLE (warehouse_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        s."Warehouse" as warehouse_name
    FROM zoho_stock_summary s
    WHERE
        s."Warehouse" IS NOT NULL
        AND s."Name" IS NOT NULL
        AND s."Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH')
    ORDER BY s."Warehouse" ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update get_stock_by_warehouse_chart function
CREATE OR REPLACE FUNCTION get_stock_by_warehouse_chart()
RETURNS TABLE (
    warehouse_name TEXT,
    total_stock_value NUMERIC,
    total_stock_value_with_vat NUMERIC,
    product_count BIGINT,
    total_quantity NUMERIC,
    avg_unit_cost NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s."Warehouse" as warehouse_name,
        SUM(s."Current Stock Value") as total_stock_value,
        SUM(s."Stock Value with VAT") as total_stock_value_with_vat,
        COUNT(DISTINCT s."Name") as product_count,
        SUM(s."Stock Qty") as total_quantity,
        ROUND(AVG(CASE WHEN s."Stock Qty" > 0 THEN s."Current Stock Value" / s."Stock Qty" END), 2) as avg_unit_cost
    FROM zoho_stock_summary s
    WHERE s."Warehouse" IS NOT NULL
        AND s."Name" IS NOT NULL
        AND s."Warehouse" NOT IN ('DACTVTD wh(shahid)', 'Jamsheed WH', 'MAJEED', 'SEB VEHICLE WH')
    GROUP BY s."Warehouse"
    ORDER BY total_stock_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON stock_report_view TO authenticated;
GRANT SELECT ON stock_report_view TO anon;
GRANT SELECT ON dashboard_kpis_view TO authenticated;
GRANT SELECT ON dashboard_kpis_view TO anon;
GRANT EXECUTE ON FUNCTION get_stock_report_aggregated(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_report_aggregated(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_warehouse_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION get_warehouse_filter_options() TO anon;
GRANT EXECUTE ON FUNCTION get_stock_by_warehouse_chart() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_by_warehouse_chart() TO anon;

-- Test queries to verify the changes
/*
-- Test 1: Check remaining warehouses
SELECT DISTINCT warehouse FROM stock_report_view;

-- Test 2: Check warehouse filter options
SELECT * FROM get_warehouse_filter_options();

-- Test 3: Check aggregated stock report
SELECT COUNT(*) as item_count FROM get_stock_report_aggregated(NULL);

-- Test 4: Check dashboard KPIs
SELECT * FROM dashboard_kpis_view;

-- Test 5: Compare before and after totals
SELECT
    'Before' as status,
    COUNT(*) as total_items,
    COUNT(DISTINCT "Warehouse") as warehouse_count
FROM zoho_stock_summary
WHERE "Name" IS NOT NULL AND "Warehouse" IS NOT NULL
UNION ALL
SELECT
    'After' as status,
    COUNT(*) as total_items,
    COUNT(DISTINCT warehouse) as warehouse_count
FROM stock_report_view;
*/