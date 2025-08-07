-- =============================================================================
-- DASHBOARD CHARTS SQL FUNCTIONS
-- =============================================================================
-- These functions provide data for various charts and visualizations
-- All functions use 2025+ data for optimal performance
-- =============================================================================

-- 1. DAILY REVENUE TREND CHART
-- Shows revenue by day for trend analysis
CREATE OR REPLACE FUNCTION get_daily_revenue_trend(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    date_key DATE,
    daily_revenue NUMERIC,
    daily_profit NUMERIC,
    daily_invoices BIGINT,
    profit_margin_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Inv Date"::DATE as date_key,
        SUM(p."Sale Price") as daily_revenue,
        SUM(p."Sale Price" - p."Cost") as daily_profit,
        COUNT(DISTINCT p."Inv No") as daily_invoices,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND p."Inv Date" IS NOT NULL
    GROUP BY p."Inv Date"::DATE
    ORDER BY date_key;
END;
$$ LANGUAGE plpgsql;

-- 2. TOP SELLING PRODUCTS CHART
-- Shows top 10 products by revenue and quantity
CREATE OR REPLACE FUNCTION get_top_selling_products(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    product_name TEXT,
    total_revenue NUMERIC,
    total_quantity NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    invoice_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Item" as product_name,
        SUM(p."Sale Price") as total_revenue,
        SUM(p."Qty") as total_quantity,
        SUM(p."Sale Price" - p."Cost") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent,
        COUNT(DISTINCT p."Inv No") as invoice_count
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND p."Item" IS NOT NULL
    GROUP BY p."Item"
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 3. CUSTOMER ANALYSIS CHART
-- Shows top customers by revenue and profit
CREATE OR REPLACE FUNCTION get_top_customers_chart(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    customer_name TEXT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    invoice_count BIGINT,
    avg_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Customer Name" as customer_name,
        SUM(p."Sale Price") as total_revenue,
        SUM(p."Sale Price" - p."Cost") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent,
        COUNT(DISTINCT p."Inv No") as invoice_count,
        ROUND(SUM(p."Sale Price") / COUNT(DISTINCT p."Inv No"), 2) as avg_order_value
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND p."Customer Name" IS NOT NULL
    GROUP BY p."Customer Name"
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 4. MONTHLY REVENUE COMPARISON
-- Shows month-over-month revenue and profit trends
CREATE OR REPLACE FUNCTION get_monthly_revenue_comparison(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    month_key TEXT,
    year_val INTEGER,
    month_val INTEGER,
    monthly_revenue NUMERIC,
    monthly_profit NUMERIC,
    monthly_invoices BIGINT,
    profit_margin_percent NUMERIC,
    avg_daily_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TO_CHAR(p."Inv Date"::DATE, 'YYYY-MM') as month_key,
        EXTRACT(YEAR FROM p."Inv Date"::DATE)::INTEGER as year_val,
        EXTRACT(MONTH FROM p."Inv Date"::DATE)::INTEGER as month_val,
        SUM(p."Sale Price") as monthly_revenue,
        SUM(p."Sale Price" - p."Cost") as monthly_profit,
        COUNT(DISTINCT p."Inv No") as monthly_invoices,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent,
        ROUND(SUM(p."Sale Price") / COUNT(DISTINCT p."Inv Date"::DATE), 2) as avg_daily_revenue
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND p."Inv Date" IS NOT NULL
    GROUP BY 
        TO_CHAR(p."Inv Date"::DATE, 'YYYY-MM'),
        EXTRACT(YEAR FROM p."Inv Date"::DATE),
        EXTRACT(MONTH FROM p."Inv Date"::DATE)
    ORDER BY year_val, month_val;
END;
$$ LANGUAGE plpgsql;

-- 5. BRANCH PERFORMANCE COMPARISON
-- Shows performance across different branches
CREATE OR REPLACE FUNCTION get_branch_performance_chart(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    branch_name TEXT,
    total_revenue NUMERIC,
    total_profit NUMERIC,
    profit_margin_percent NUMERIC,
    invoice_count BIGINT,
    avg_order_value NUMERIC,
    unique_customers BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Branch Name" as branch_name,
        SUM(p."Sale Price") as total_revenue,
        SUM(p."Sale Price" - p."Cost") as total_profit,
        CASE 
            WHEN SUM(p."Sale Price") > 0 
            THEN ROUND((SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100, 2)
            ELSE 0 
        END as profit_margin_percent,
        COUNT(DISTINCT p."Inv No") as invoice_count,
        ROUND(SUM(p."Sale Price") / COUNT(DISTINCT p."Inv No"), 2) as avg_order_value,
        COUNT(DISTINCT p."Customer Name") as unique_customers
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND p."Branch Name" IS NOT NULL
    GROUP BY p."Branch Name"
    ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- 6. PROFIT MARGIN DISTRIBUTION
-- Shows products/customers by profit margin ranges
CREATE OR REPLACE FUNCTION get_profit_margin_distribution(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL,
    analysis_type TEXT DEFAULT 'products' -- 'products' or 'customers'
)
RETURNS TABLE (
    margin_range TEXT,
    item_count BIGINT,
    total_revenue NUMERIC,
    percentage_of_total NUMERIC
) AS $$
DECLARE
    total_revenue_sum NUMERIC;
BEGIN
    -- Get total revenue for percentage calculation
    SELECT SUM(p."Sale Price") INTO total_revenue_sum
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter);

    IF analysis_type = 'products' THEN
        RETURN QUERY
        WITH margin_data AS (
            SELECT 
                p."Item",
                CASE 
                    WHEN SUM(p."Sale Price") > 0 
                    THEN (SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100
                    ELSE 0 
                END as margin_percent,
                SUM(p."Sale Price") as revenue
            FROM profit_analysis_view_current p
            WHERE p."Inv Date"::DATE >= start_date 
                AND p."Inv Date"::DATE <= end_date
                AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
                AND p."Item" IS NOT NULL
            GROUP BY p."Item"
        )
        SELECT 
            CASE 
                WHEN margin_percent < 0 THEN 'Loss (<0%)'
                WHEN margin_percent >= 0 AND margin_percent < 10 THEN 'Low (0-10%)'
                WHEN margin_percent >= 10 AND margin_percent < 20 THEN 'Medium (10-20%)'
                WHEN margin_percent >= 20 AND margin_percent < 30 THEN 'Good (20-30%)'
                ELSE 'High (30%+)'
            END as margin_range,
            COUNT(*)::BIGINT as item_count,
            SUM(revenue) as total_revenue,
            ROUND((SUM(revenue) / total_revenue_sum) * 100, 2) as percentage_of_total
        FROM margin_data
        GROUP BY 
            CASE 
                WHEN margin_percent < 0 THEN 'Loss (<0%)'
                WHEN margin_percent >= 0 AND margin_percent < 10 THEN 'Low (0-10%)'
                WHEN margin_percent >= 10 AND margin_percent < 20 THEN 'Medium (10-20%)'
                WHEN margin_percent >= 20 AND margin_percent < 30 THEN 'Good (20-30%)'
                ELSE 'High (30%+)'
            END
        ORDER BY 
            CASE 
                WHEN margin_range = 'Loss (<0%)' THEN 1
                WHEN margin_range = 'Low (0-10%)' THEN 2
                WHEN margin_range = 'Medium (10-20%)' THEN 3
                WHEN margin_range = 'Good (20-30%)' THEN 4
                ELSE 5
            END;
    ELSE
        -- Customer analysis
        RETURN QUERY
        WITH margin_data AS (
            SELECT 
                p."Customer Name",
                CASE 
                    WHEN SUM(p."Sale Price") > 0 
                    THEN (SUM(p."Sale Price" - p."Cost") / SUM(p."Sale Price")) * 100
                    ELSE 0 
                END as margin_percent,
                SUM(p."Sale Price") as revenue
            FROM profit_analysis_view_current p
            WHERE p."Inv Date"::DATE >= start_date 
                AND p."Inv Date"::DATE <= end_date
                AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
                AND p."Customer Name" IS NOT NULL
            GROUP BY p."Customer Name"
        )
        SELECT 
            CASE 
                WHEN margin_percent < 0 THEN 'Loss (<0%)'
                WHEN margin_percent >= 0 AND margin_percent < 10 THEN 'Low (0-10%)'
                WHEN margin_percent >= 10 AND margin_percent < 20 THEN 'Medium (10-20%)'
                WHEN margin_percent >= 20 AND margin_percent < 30 THEN 'Good (20-30%)'
                ELSE 'High (30%+)'
            END as margin_range,
            COUNT(*)::BIGINT as item_count,
            SUM(revenue) as total_revenue,
            ROUND((SUM(revenue) / total_revenue_sum) * 100, 2) as percentage_of_total
        FROM margin_data
        GROUP BY 
            CASE 
                WHEN margin_percent < 0 THEN 'Loss (<0%)'
                WHEN margin_percent >= 0 AND margin_percent < 10 THEN 'Low (0-10%)'
                WHEN margin_percent >= 10 AND margin_percent < 20 THEN 'Medium (10-20%)'
                WHEN margin_percent >= 20 AND margin_percent < 30 THEN 'Good (20-30%)'
                ELSE 'High (30%+)'
            END
        ORDER BY 
            CASE 
                WHEN margin_range = 'Loss (<0%)' THEN 1
                WHEN margin_range = 'Low (0-10%)' THEN 2
                WHEN margin_range = 'Medium (10-20%)' THEN 3
                WHEN margin_range = 'Good (20-30%)' THEN 4
                ELSE 5
            END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. WEEKLY PERFORMANCE HEATMAP DATA
-- Shows performance by day of week and hour (if time data available)
CREATE OR REPLACE FUNCTION get_weekly_performance_heatmap(
    start_date DATE DEFAULT '2025-01-01',
    end_date DATE DEFAULT CURRENT_DATE,
    branch_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    day_of_week INTEGER,
    day_name TEXT,
    total_revenue NUMERIC,
    total_invoices BIGINT,
    avg_order_value NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(DOW FROM p."Inv Date"::DATE)::INTEGER as day_of_week,
        TO_CHAR(p."Inv Date"::DATE, 'Day') as day_name,
        SUM(p."Sale Price") as total_revenue,
        COUNT(DISTINCT p."Inv No") as total_invoices,
        ROUND(SUM(p."Sale Price") / COUNT(DISTINCT p."Inv No"), 2) as avg_order_value
    FROM profit_analysis_view_current p
    WHERE p."Inv Date"::DATE >= start_date 
        AND p."Inv Date"::DATE <= end_date
        AND (branch_filter IS NULL OR p."Branch Name" = branch_filter)
        AND p."Inv Date" IS NOT NULL
    GROUP BY 
        EXTRACT(DOW FROM p."Inv Date"::DATE),
        TO_CHAR(p."Inv Date"::DATE, 'Day')
    ORDER BY day_of_week;
END;
$$ LANGUAGE plpgsql;

-- 8. STOCK VALUE ANALYSIS BY WAREHOUSE
-- Shows stock distribution across warehouses (including negative adjustments)
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
        -- Removed quantity filter to include negative stock movements
    GROUP BY s."Warehouse"
    ORDER BY total_stock_value DESC;
END;
$$ LANGUAGE plpgsql;