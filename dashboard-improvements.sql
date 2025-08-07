-- =============================================================================
-- DASHBOARD IMPROVEMENTS - 2025 Data Only + Additional Filters
-- =============================================================================
-- This file contains updated RPC functions that:
-- 1. Load data from 2025-01-01 onwards only
-- 2. Add warehouse filter for stock report
-- 3. Add customer/invoice filters for profit by invoice
-- 4. Remove unnecessary search filters
-- =============================================================================

-- =============================================================================
-- 1. UPDATED DASHBOARD KPIs - 2025 DATA ONLY
-- =============================================================================
CREATE OR REPLACE FUNCTION get_dashboard_kpis_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
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
        
        -- Percentage calculations
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as profit_margin_percent,
        
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN (SUM(p."Profit") / SUM(p."Sale Price")) * 100 
            ELSE 0 
        END as gross_profit_percentage,
        
        -- Quantity and count metrics
        SUM(p."Qty") as total_quantity,
        COUNT(*) as total_line_items,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        COUNT(DISTINCT p."Customer Name") as unique_customers,
        COUNT(DISTINCT p."Branch Name") as active_branches,
        
        -- Average order value
        CASE 
            WHEN COUNT(DISTINCT p."Inv No") > 0 
            THEN SUM(p."Sale Price") / COUNT(DISTINCT p."Inv No")
            ELSE 0
        END as average_order_value,
        
        -- Date range
        MIN(p."Inv Date"::DATE) as earliest_transaction,
        MAX(p."Inv Date"::DATE) as latest_transaction,
        
        -- Stock metrics (from stock table)
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
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. PROFIT BY ITEM - 2025 DATA ONLY (NO SEARCH FILTER)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_item_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    item_filter TEXT DEFAULT NULL,
    customer_filter TEXT DEFAULT NULL,
    invoice_filter TEXT DEFAULT NULL,
    page_limit INTEGER DEFAULT 10000,
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
BEGIN
    RETURN QUERY
    SELECT 
        p."Inv No" as inv_no,
        p."Inv Date" as inv_date,
        p."Item" as item,
        p."Qty" as qty,
        p."Sale Price" as sale_price,
        p."SaleWithVAT" as sale_with_vat,
        p."Cost" as cost,
        p."Profit" as profit,
        CASE 
            WHEN p."Sale Price" > 0 THEN (p."Profit" / p."Sale Price") * 100 
            ELSE 0 
        END as profit_percent,
        COALESCE(p."Customer Name", 'Unknown') as customer_name,
        p."Branch Name" as branch_name,
        CASE 
            WHEN p."Qty" > 0 THEN p."Sale Price" / p."Qty"
            ELSE 0
        END as unit_price,
        CASE 
            WHEN p."Qty" > 0 THEN p."Cost" / p."Qty"
            ELSE 0
        END as unit_cost,
        CASE 
            WHEN p."Qty" > 0 THEN p."Profit" / p."Qty"
            ELSE 0
        END as unit_profit,
        p."Sales Person Name" as sales_person_name,
        p."Invoice Status" as invoice_status,
        -- Get total count for pagination
        COUNT(*) OVER() as total_count
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (item_filter IS NULL OR p."Item" = item_filter)
        AND (customer_filter IS NULL OR p."Customer Name" = customer_filter)
        AND (invoice_filter IS NULL OR p."Inv No" = invoice_filter)
    ORDER BY p."Inv Date" DESC, p."Inv No" DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. PROFIT BY INVOICE - 2025 DATA ONLY WITH CUSTOMER/INVOICE FILTERS
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_invoice_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    customer_filter TEXT DEFAULT NULL,
    invoice_filter TEXT DEFAULT NULL,
    page_limit INTEGER DEFAULT 10000,
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
BEGIN
    RETURN QUERY
    SELECT 
        p."Inv No" as invoice_no,
        MIN(p."Inv Date") as inv_date,
        MIN(COALESCE(p."Customer Name", 'Unknown')) as customer_name,
        MIN(p."Branch Name") as branch_name,
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
        -- Get total count for pagination
        COUNT(DISTINCT p."Inv No") OVER() as total_count
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL 
        AND p."Inv No" IS NOT NULL
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (customer_filter IS NULL OR p."Customer Name" = customer_filter)
        AND (invoice_filter IS NULL OR p."Inv No" = invoice_filter)
    GROUP BY p."Inv No"
    ORDER BY MIN(p."Inv Date") DESC, p."Inv No" DESC
    LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. PROFIT BY CUSTOMER - 2025 DATA ONLY WITH CUSTOMER FILTER
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_customer_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    customer_filter TEXT DEFAULT NULL
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
    first_transaction_date TEXT,
    last_transaction_date TEXT,
    total_line_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p."Customer Name", 'Unknown') as customer_name,
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
        MIN(p."Inv Date") as first_transaction_date,
        MAX(p."Inv Date") as last_transaction_date,
        COUNT(*) as total_line_items
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND (customer_filter IS NULL OR p."Customer Name" = customer_filter)
    GROUP BY COALESCE(p."Customer Name", 'Unknown')
    ORDER BY SUM(p."Profit") DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. STOCK REPORT WITH WAREHOUSE FILTER
-- =============================================================================
CREATE OR REPLACE FUNCTION get_stock_report_filtered(
    warehouse_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
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
        s."Name" as product_name,
        s."Warehouse" as warehouse,
        s."Unit" as unit,
        s."Stock Qty" as stock_quantity,
        s."Stock in Pieces" as stock_in_pieces,
        s."Current Stock Value" as current_stock_value,
        s."Stock Value with VAT" as stock_value_with_vat,
        -- Calculate unit cost (avoid division by zero)
        CASE 
            WHEN s."Stock Qty" > 0 THEN s."Current Stock Value" / s."Stock Qty"
            ELSE 0
        END as unit_cost,
        -- Calculate VAT amount
        COALESCE(s."Stock Value with VAT", 0) - COALESCE(s."Current Stock Value", 0) as vat_amount
    FROM zoho_stock_summary s
    WHERE 
        s."Name" IS NOT NULL
        AND (warehouse_filter IS NULL OR s."Warehouse" = warehouse_filter)
    ORDER BY s."Name" ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. FILTER OPTIONS FOR 2025 DATA
-- =============================================================================

-- Get warehouse options for stock filter
CREATE OR REPLACE FUNCTION get_warehouse_filter_options()
RETURNS TABLE(
    warehouse_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        s."Warehouse" as warehouse_name
    FROM zoho_stock_summary s
    WHERE 
        s."Warehouse" IS NOT NULL
        AND s."Name" IS NOT NULL
    ORDER BY s."Warehouse" ASC;
END;
$$ LANGUAGE plpgsql;

-- Get customer options for 2025 data
CREATE OR REPLACE FUNCTION get_customer_filter_options_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
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
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY customer_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Get invoice options for 2025 data
CREATE OR REPLACE FUNCTION get_invoice_filter_options_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
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
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Inv No" ASC;
END;
$$ LANGUAGE plpgsql;

-- Get item options for 2025 data
CREATE OR REPLACE FUNCTION get_item_filter_options_2025(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
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
        AND p."Inv Date"::DATE >= COALESCE(start_date, '2025-01-01')
        AND p."Inv Date"::DATE <= COALESCE(end_date, CURRENT_DATE)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    ORDER BY p."Item" ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TEST QUERIES
-- =============================================================================

-- Test KPIs for 2025
-- SELECT * FROM get_dashboard_kpis_2025();

-- Test profit by item with filters
-- SELECT * FROM get_profit_by_item_2025(NULL, NULL, NULL, NULL, NULL, NULL, 10, 0);

-- Test profit by invoice with filters
-- SELECT * FROM get_profit_by_invoice_2025(NULL, NULL, NULL, NULL, NULL, 10, 0);

-- Test profit by customer with filter
-- SELECT * FROM get_profit_by_customer_2025();

-- Test stock with warehouse filter
-- SELECT * FROM get_stock_report_filtered(NULL);

-- Test filter options
-- SELECT * FROM get_warehouse_filter_options();
-- SELECT * FROM get_customer_filter_options_2025();
-- SELECT * FROM get_invoice_filter_options_2025();
-- SELECT * FROM get_item_filter_options_2025();