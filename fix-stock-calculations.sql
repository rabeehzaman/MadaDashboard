-- =============================================================================
-- FIX STOCK CALCULATIONS TO INCLUDE NEGATIVE VALUES
-- =============================================================================
-- This script fixes the stock calculations to properly account for negative
-- inventory movements (returns, adjustments, outgoing stock)
-- =============================================================================

-- 1. Create or replace the stock report view to include negative quantities
-- Using the correct column names from your database
CREATE OR REPLACE VIEW stock_report_view AS
SELECT 
    s."Name" as product_name,
    s."Warehouse" as warehouse,
    s."Unit" as unit,
    s."Stock Qty" as stock_quantity,
    s."Stock in Pieces" as stock_in_pieces,
    s."Current Stock Value" as current_stock_value,
    s."Stock Value with VAT" as stock_value_with_vat,
    -- Calculate unit cost from current stock value and quantity
    CASE 
        WHEN s."Stock Qty" > 0 THEN s."Current Stock Value" / s."Stock Qty"
        ELSE 0 
    END as unit_cost,
    (s."Stock Value with VAT" - s."Current Stock Value") as vat_amount
FROM zoho_stock_summary s
WHERE s."Name" IS NOT NULL 
    AND s."Warehouse" IS NOT NULL
    -- Removed quantity filter to include negative stock
ORDER BY s."Name", s."Warehouse";

-- 2. Create a function to get stock report with proper negative handling
CREATE OR REPLACE FUNCTION get_stock_report_filtered(warehouse_filter TEXT DEFAULT NULL)
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
    RETURN QUERY
    SELECT 
        s."Name"::TEXT as product_name,
        s."Warehouse"::TEXT as warehouse,
        s."Unit"::TEXT as unit,
        s."Stock Qty" as stock_quantity,
        s."Stock in Pieces" as stock_in_pieces,
        s."Current Stock Value" as current_stock_value,
        s."Stock Value with VAT" as stock_value_with_vat,
        -- Calculate unit cost from current stock value and quantity
        CASE 
            WHEN s."Stock Qty" > 0 THEN s."Current Stock Value" / s."Stock Qty"
            ELSE 0 
        END as unit_cost,
        (s."Stock Value with VAT" - s."Current Stock Value") as vat_amount
    FROM zoho_stock_summary s
    WHERE s."Name" IS NOT NULL 
        AND s."Warehouse" IS NOT NULL
        AND (warehouse_filter IS NULL OR s."Warehouse" = warehouse_filter)
        -- Include all quantities (positive and negative)
    ORDER BY s."Name", s."Warehouse";
END;
$$ LANGUAGE plpgsql;

-- 3. Update the KPI calculation to properly sum stock values (including negatives)
CREATE OR REPLACE FUNCTION get_dashboard_kpis_2025_fixed(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
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
        -- Revenue and sales metrics (from profit analysis)
        SUM(p."Sale Price") as total_revenue,
        SUM(p."Sale with VAT") as total_taxable_sales,
        SUM(p."Cost") as total_cost,
        SUM(p."Sale Price" - p."Cost") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as gross_profit_percentage,
        SUM(p."Qty") as total_quantity,
        COUNT(*) as total_line_items,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        COUNT(DISTINCT p."Customer Name") as unique_customers,
        COUNT(DISTINCT p."Branch Name") as active_branches,
        CASE 
            WHEN COUNT(DISTINCT p."Inv No") > 0 
            THEN ROUND(SUM(p."Sale Price") / COUNT(DISTINCT p."Inv No"), 2)
            ELSE 0 
        END as average_order_value,
        MIN(p."Inv Date"::DATE) as earliest_transaction,
        MAX(p."Inv Date"::DATE) as latest_transaction,
        -- Stock value from stock summary (including negative adjustments)
        (SELECT SUM(s."Stock Value with VAT") 
         FROM zoho_stock_summary s 
         WHERE s."Name" IS NOT NULL) as total_stock_value,
        SUM(p."Sale Price" - p."Cost") as gross_profit,
        CASE 
            WHEN (MAX(p."Inv Date"::DATE) - MIN(p."Inv Date"::DATE) + 1) > 0 
            THEN ROUND(SUM(p."Sale Price") / (MAX(p."Inv Date"::DATE) - MIN(p."Inv Date"::DATE) + 1), 2)
            ELSE 0 
        END as daily_avg_sales
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);
END;
$$ LANGUAGE plpgsql;

-- 4. Test the fixes with some sample data
-- You can run this after executing the above functions
/*
-- Test negative stock handling
SELECT 
    warehouse,
    SUM(stock_quantity) as net_stock_qty,
    SUM(current_stock_value) as net_stock_value,
    COUNT(*) as total_items,
    COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as positive_items,
    COUNT(CASE WHEN stock_quantity < 0 THEN 1 END) as negative_items
FROM stock_report_view
GROUP BY warehouse
ORDER BY net_stock_value DESC;
*/