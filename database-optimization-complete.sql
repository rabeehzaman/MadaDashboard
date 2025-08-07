-- =============================================================================
-- MADA DASHBOARD DATABASE OPTIMIZATION - COMPLETE SOLUTION
-- =============================================================================
-- This file contains all SQL views and RPC functions needed to solve:
-- 1. Data consistency between KPIs and table totals
-- 2. Date sorting issues (newest first)
-- 3. Branch filtering problems
-- 4. Performance optimization
-- 5. Unified data source for all calculations
-- =============================================================================

-- Drop existing views and functions if they exist (for clean install)
DROP VIEW IF EXISTS profit_by_item_view CASCADE;
DROP VIEW IF EXISTS profit_by_customer_view CASCADE;
DROP VIEW IF EXISTS profit_by_invoice_view CASCADE;
DROP VIEW IF EXISTS stock_report_view CASCADE;
DROP VIEW IF EXISTS dashboard_kpis_view CASCADE;

DROP FUNCTION IF EXISTS get_dashboard_kpis(DATE, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_profit_by_item_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_profit_by_customer_filtered(DATE, DATE, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_profit_by_invoice_filtered(DATE, DATE, TEXT, INTEGER, INTEGER) CASCADE;

-- =============================================================================
-- 1. PROFIT BY ITEM VIEW - Individual transactions, sorted by date DESC
-- =============================================================================
CREATE VIEW profit_by_item_view AS
SELECT 
    "Inv No" as inv_no,
    "Inv Date" as inv_date,
    "Item" as item,
    "Qty" as qty,
    "Sale Price" as sale_price,
    "SaleWithVAT" as sale_with_vat,
    "Cost" as cost,
    "Profit" as profit,
    "Profit %" as profit_percent,
    "Customer Name" as customer_name,
    "Branch Name" as branch_name,
    "Unit Price" as unit_price,
    "Unit Cost" as unit_cost,
    "Unit Profit" as unit_profit,
    "Sales Person Name" as sales_person_name,
    "Invoice Status" as invoice_status,
    -- Ensure proper date sorting (newest first by default)
    CASE 
        WHEN "Inv Date" IS NOT NULL THEN "Inv Date"::DATE
        ELSE '1970-01-01'::DATE
    END as sort_date
FROM profit_analysis_view_current
WHERE "Inv Date" IS NOT NULL 
ORDER BY sort_date DESC, "Inv No" DESC;

-- =============================================================================
-- 2. PROFIT BY CUSTOMER VIEW - Customer aggregations, sorted by profit DESC
-- =============================================================================
CREATE VIEW profit_by_customer_view AS
SELECT 
    COALESCE("Customer Name", 'Unknown') as customer_name,
    COUNT(DISTINCT "Inv No") as total_invoices,
    SUM("Qty") as total_quantity,
    SUM("Sale Price") as total_sale_price,
    SUM("SaleWithVAT") as total_sale_with_vat,
    SUM("Cost") as total_cost,
    SUM("Profit") as total_profit,
    CASE 
        WHEN SUM("Sale Price") > 0 THEN (SUM("Profit") / SUM("Sale Price")) * 100
        ELSE 0
    END as profit_margin_percent,
    MIN("Inv Date") as first_transaction_date,
    MAX("Inv Date") as last_transaction_date,
    COUNT(*) as total_line_items
FROM profit_analysis_view_current
WHERE "Inv Date" IS NOT NULL
GROUP BY COALESCE("Customer Name", 'Unknown')
ORDER BY total_profit DESC;

-- =============================================================================
-- 3. PROFIT BY INVOICE VIEW - Invoice aggregations, sorted by date DESC
-- =============================================================================
CREATE VIEW profit_by_invoice_view AS
SELECT 
    "Inv No" as invoice_no,
    "Inv Date" as inv_date,
    COALESCE("Customer Name", 'Unknown') as customer_name,
    "Branch Name" as branch_name,
    COUNT(*) as line_items_count,
    SUM("Qty") as total_quantity,
    SUM("Sale Price") as total_sale_price,
    SUM("SaleWithVAT") as total_sale_with_vat,
    SUM("Cost") as total_cost,
    SUM("Profit") as total_profit,
    CASE 
        WHEN SUM("Sale Price") > 0 THEN (SUM("Profit") / SUM("Sale Price")) * 100
        ELSE 0
    END as profit_margin_percent,
    -- Ensure proper date sorting
    CASE 
        WHEN "Inv Date" IS NOT NULL THEN "Inv Date"::DATE
        ELSE '1970-01-01'::DATE
    END as sort_date
FROM profit_analysis_view_current
WHERE "Inv Date" IS NOT NULL AND "Inv No" IS NOT NULL
GROUP BY "Inv No", "Inv Date", "Customer Name", "Branch Name"
ORDER BY sort_date DESC, invoice_no DESC;

-- =============================================================================
-- 4. STOCK REPORT VIEW - Stock data with calculated metrics
-- =============================================================================
CREATE VIEW stock_report_view AS
SELECT 
    "Name" as product_name,
    "Warehouse" as warehouse,
    "Unit" as unit,
    "Stock Qty" as stock_quantity,
    "Stock in Pieces" as stock_in_pieces,
    "Current Stock Value" as current_stock_value,
    "Stock Value with VAT" as stock_value_with_vat,
    -- Calculate unit cost (avoid division by zero)
    CASE 
        WHEN "Stock Qty" > 0 THEN "Current Stock Value" / "Stock Qty"
        ELSE 0
    END as unit_cost,
    -- Calculate VAT amount
    COALESCE("Stock Value with VAT", 0) - COALESCE("Current Stock Value", 0) as vat_amount
FROM zoho_stock_summary
WHERE "Name" IS NOT NULL
ORDER BY "Name" ASC;

-- =============================================================================
-- 5. DASHBOARD KPIs VIEW - Pre-calculated KPIs for instant loading
-- =============================================================================
CREATE VIEW dashboard_kpis_view AS
SELECT 
    -- Revenue metrics
    SUM("SaleWithVAT") as total_revenue,
    SUM("Sale Price") as total_taxable_sales,
    SUM("Cost") as total_cost,
    SUM("Profit") as total_profit,
    
    -- Calculated metrics
    CASE 
        WHEN SUM("SaleWithVAT") > 0 THEN (SUM("Profit") / SUM("SaleWithVAT")) * 100
        ELSE 0
    END as profit_margin_percent,
    
    CASE 
        WHEN SUM("Sale Price") > 0 THEN (SUM("Profit") / SUM("Sale Price")) * 100
        ELSE 0
    END as gross_profit_percentage,
    
    -- Volume metrics
    SUM("Qty") as total_quantity,
    COUNT(*) as total_line_items,
    COUNT(DISTINCT "Inv No") as total_invoices,
    COUNT(DISTINCT "Customer Name") as unique_customers,
    COUNT(DISTINCT "Branch Name") as active_branches,
    
    -- Average metrics
    CASE 
        WHEN COUNT(DISTINCT "Inv No") > 0 THEN SUM("SaleWithVAT") / COUNT(DISTINCT "Inv No")
        ELSE 0
    END as average_order_value,
    
    -- Date range
    MIN("Inv Date") as earliest_transaction,
    MAX("Inv Date") as latest_transaction,
    
    -- Stock metrics (from separate table)
    (SELECT SUM("Stock Value with VAT") FROM zoho_stock_summary) as total_stock_value,
    
    -- Gross profit (Sale Price - Cost)
    SUM("Sale Price") - SUM("Cost") as gross_profit,
    
    -- Daily average (approximate based on data range)
    CASE 
        WHEN MAX("Inv Date")::DATE > MIN("Inv Date")::DATE 
        THEN SUM("Sale Price") / (MAX("Inv Date")::DATE - MIN("Inv Date")::DATE + 1)
        ELSE SUM("Sale Price")
    END as daily_avg_sales
    
FROM profit_analysis_view_current
WHERE "Inv Date" IS NOT NULL;

-- =============================================================================
-- RPC FUNCTIONS FOR FILTERED QUERIES
-- =============================================================================

-- =============================================================================
-- 1. GET DASHBOARD KPIs WITH FILTERING
-- =============================================================================
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
        
        -- Stock metrics (from separate table)
        (SELECT SUM(s."Stock Value with VAT") FROM zoho_stock_summary s) as total_stock_value,
        
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
-- 2. GET PROFIT BY ITEM FILTERED (with pagination)
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
BEGIN
    RETURN QUERY
    WITH filtered_data AS (
        SELECT 
            p."Inv No",
            p."Inv Date",
            p."Item",
            p."Qty",
            p."Sale Price",
            p."SaleWithVAT",
            p."Cost",
            p."Profit",
            p."Profit %",
            p."Customer Name",
            p."Branch Name",
            p."Unit Price",
            p."Unit Cost",
            p."Unit Profit",
            p."Sales Person Name",
            p."Invoice Status",
            CASE 
                WHEN p."Inv Date" IS NOT NULL THEN p."Inv Date"::DATE
                ELSE '1970-01-01'::DATE
            END as sort_date,
            COUNT(*) OVER() as total_count
        FROM profit_analysis_view_current p
        WHERE 
            p."Inv Date" IS NOT NULL
            AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
            AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
            AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        ORDER BY sort_date DESC, p."Inv No" DESC
        LIMIT page_limit OFFSET page_offset
    )
    SELECT 
        f."Inv No",
        f."Inv Date",
        f."Item",
        f."Qty",
        f."Sale Price",
        f."SaleWithVAT",
        f."Cost",
        f."Profit",
        f."Profit %",
        f."Customer Name",
        f."Branch Name",
        f."Unit Price",
        f."Unit Cost",
        f."Unit Profit",
        f."Sales Person Name",
        f."Invoice Status",
        f.total_count
    FROM filtered_data f;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. GET PROFIT BY CUSTOMER FILTERED
-- =============================================================================
CREATE OR REPLACE FUNCTION get_profit_by_customer_filtered(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    branch_filter TEXT DEFAULT NULL
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
        MIN(p."Inv Date"::DATE) as first_transaction_date,
        MAX(p."Inv Date"::DATE) as last_transaction_date,
        COUNT(*) as total_line_items
    FROM profit_analysis_view_current p
    WHERE 
        p."Inv Date" IS NOT NULL
        AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
        AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
    GROUP BY COALESCE(p."Customer Name", 'Unknown')
    ORDER BY total_profit DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. GET PROFIT BY INVOICE FILTERED (with pagination)
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
BEGIN
    RETURN QUERY
    WITH filtered_data AS (
        SELECT 
            p."Inv No" as invoice_no,
            p."Inv Date" as inv_date,
            COALESCE(p."Customer Name", 'Unknown') as customer_name,
            p."Branch Name" as branch_name,
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
            CASE 
                WHEN p."Inv Date" IS NOT NULL THEN p."Inv Date"::DATE
                ELSE '1970-01-01'::DATE
            END as sort_date,
            COUNT(*) OVER() as total_count
        FROM profit_analysis_view_current p
        WHERE 
            p."Inv Date" IS NOT NULL 
            AND p."Inv No" IS NOT NULL
            AND (start_date IS NULL OR p."Inv Date"::DATE >= start_date)
            AND (end_date IS NULL OR p."Inv Date"::DATE <= end_date)
            AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        GROUP BY p."Inv No", p."Inv Date", p."Customer Name", p."Branch Name"
        ORDER BY sort_date DESC, invoice_no DESC
        LIMIT page_limit OFFSET page_offset
    )
    SELECT 
        f.invoice_no,
        f.inv_date,
        f.customer_name,
        f.branch_name,
        f.line_items_count,
        f.total_quantity,
        f.total_sale_price,
        f.total_sale_with_vat,
        f.total_cost,
        f.total_profit,
        f.profit_margin_percent,
        f.total_count
    FROM filtered_data f;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================================================

-- NOTE: Since profit_analysis_view_current is a VIEW, we cannot create indexes on it directly.
-- Instead, you should create indexes on the underlying BASE TABLE that the view uses.
-- 
-- TO FIND THE BASE TABLE: Run this query in your Supabase SQL editor:
-- SELECT definition FROM pg_views WHERE viewname = 'profit_analysis_view_current';
--
-- Then create indexes on the actual base table columns that are used in the WHERE clauses.
-- Common base table names might be: invoices, transactions, sales_data, etc.
--
-- EXAMPLE (replace 'your_base_table' with the actual table name):
-- CREATE INDEX IF NOT EXISTS idx_base_table_inv_date ON your_base_table (inv_date);
-- CREATE INDEX IF NOT EXISTS idx_base_table_branch ON your_base_table (branch_name);
-- CREATE INDEX IF NOT EXISTS idx_base_table_customer ON your_base_table (customer_name);
-- CREATE INDEX IF NOT EXISTS idx_base_table_inv_no ON your_base_table (invoice_number);
-- CREATE INDEX IF NOT EXISTS idx_base_table_date_branch ON your_base_table (inv_date, branch_name);

-- Stock-related indexes (zoho_stock_summary is also a view, so we index the base tables)
-- Based on the zoho_stock_summary view definition, these are the base tables:
CREATE INDEX IF NOT EXISTS idx_items_id ON items (item_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items (item_name);
CREATE INDEX IF NOT EXISTS idx_stock_in_flow_product_id ON stock_in_flow (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_flow_warehouse_id ON stock_in_flow (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_id ON warehouses (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses (warehouse_name);

-- =============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES FOR BASE TABLES
-- =============================================================================

-- Based on the profit_analysis_view_current definition, these are the base tables:
-- invoices, invoice_items, customers, sales_persons, branch, credit_notes, credit_note_items
-- 
-- These indexes will significantly improve query performance for filtering and sorting:

-- Indexes for invoices table (main table for date and branch filtering)
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id ON invoices (branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date_branch ON invoices (invoice_date, branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (invoice_status);

-- Indexes for credit_notes table (for credit note transactions)
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON credit_notes (credit_note_date);
CREATE INDEX IF NOT EXISTS idx_credit_notes_branch_id ON credit_notes (branch_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_number ON credit_notes (credit_note_number);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date_branch ON credit_notes (credit_note_date, branch_id);

-- Indexes for invoice_items table (for item-level filtering)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_item_id ON invoice_items (item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_name ON invoice_items (item_name);

-- Indexes for credit_note_items table
CREATE INDEX IF NOT EXISTS idx_credit_note_items_creditnotes_id ON credit_note_items (creditnotes_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_items_item_id ON credit_note_items (item_id);

-- Indexes for customers table (for customer filtering)
CREATE INDEX IF NOT EXISTS idx_customers_id ON customers (customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (customer_name);

-- Indexes for branch table (for branch name lookups)
CREATE INDEX IF NOT EXISTS idx_branch_id ON branch (branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_name ON branch (branch_name);

-- Indexes for sales_persons table
CREATE INDEX IF NOT EXISTS idx_sales_persons_id ON sales_persons (sales_person_id);
CREATE INDEX IF NOT EXISTS idx_sales_persons_name ON sales_persons (name);

-- Indexes for FIFO/stock flow tables (for cost calculations)
CREATE INDEX IF NOT EXISTS idx_stock_out_flow_invoice_item_id ON stock_out_flow (invoice_item_id);
CREATE INDEX IF NOT EXISTS idx_fifo_mapping_stock_out_flow_id ON fifo_mapping (stock_out_flow_id);
CREATE INDEX IF NOT EXISTS idx_fifo_mapping_stock_in_flow_id ON fifo_mapping (stock_in_flow_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_flow_id ON stock_in_flow (stock_in_flow_id);
CREATE INDEX IF NOT EXISTS idx_stock_in_flow_credit_notes_item_id ON stock_in_flow (credit_notes_item_id);

-- =============================================================================
-- TESTING QUERIES - Use these to verify the setup works correctly
-- =============================================================================

-- Test 1: Basic KPI query (should return 1 row with aggregated totals)
-- SELECT * FROM get_dashboard_kpis(NULL, NULL, NULL);

-- Test 2: Filtered KPI query (date range only)
-- SELECT * FROM get_dashboard_kpis('2024-01-01'::DATE, '2024-12-31'::DATE, NULL);

-- Test 3: Branch filtered KPI query  
-- SELECT * FROM get_dashboard_kpis(NULL, NULL, 'Main Branch');

-- Test 4: Item data with pagination
-- SELECT * FROM get_profit_by_item_filtered(NULL, NULL, NULL, 10, 0);

-- Test 5: Customer aggregations
-- SELECT * FROM get_profit_by_customer_filtered(NULL, NULL, NULL);

-- Test 6: Invoice data with pagination
-- SELECT * FROM get_profit_by_invoice_filtered(NULL, NULL, NULL, 10, 0);

-- Test 7: Verify views work
-- SELECT * FROM dashboard_kpis_view LIMIT 1;
-- SELECT * FROM profit_by_item_view LIMIT 5;
-- SELECT * FROM profit_by_customer_view LIMIT 5;
-- SELECT * FROM profit_by_invoice_view LIMIT 5;
-- SELECT * FROM stock_report_view LIMIT 5;

-- =============================================================================
-- INSTALLATION COMPLETE
-- =============================================================================

-- After running this SQL in your Supabase dashboard:
-- 1. All views will be created and available
-- 2. All RPC functions will be ready for use
-- 3. Indexes will improve query performance
-- 4. Data consistency issues will be resolved
-- 5. All calculations will be done at database level

-- Your React components can now use these optimized endpoints:
-- - get_dashboard_kpis() for consistent KPI calculations
-- - get_profit_by_item_filtered() for item table data
-- - get_profit_by_customer_filtered() for customer table data  
-- - get_profit_by_invoice_filtered() for invoice table data
-- - Direct view queries for stock data

-- This ensures KPIs and table totals will ALWAYS match exactly!