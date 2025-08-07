-- Debug: Investigate stock data structure and negative values
-- Run these queries in Supabase SQL Editor to understand the stock data

-- 1. Check the structure of zoho_stock_summary table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'zoho_stock_summary' 
ORDER BY ordinal_position;

-- 2. Check for negative quantities in the data
SELECT 
    "Warehouse",
    "Name" as product_name,
    "Quantity",
    "Stock Value",
    "Stock Value with VAT",
    "Unit Cost"
FROM zoho_stock_summary 
WHERE "Quantity" < 0
ORDER BY "Quantity" ASC
LIMIT 20;

-- 3. Check the range of quantities (positive and negative)
SELECT 
    MIN("Quantity") as min_quantity,
    MAX("Quantity") as max_quantity,
    COUNT(*) as total_records,
    COUNT(CASE WHEN "Quantity" > 0 THEN 1 END) as positive_qty,
    COUNT(CASE WHEN "Quantity" < 0 THEN 1 END) as negative_qty,
    COUNT(CASE WHEN "Quantity" = 0 THEN 1 END) as zero_qty
FROM zoho_stock_summary
WHERE "Name" IS NOT NULL;

-- 4. Sample data to understand the structure
SELECT 
    "Warehouse",
    "Name" as product_name,
    "Quantity",
    "Stock Value",
    "Stock Value with VAT",
    "Unit Cost",
    "Last Modified Time"
FROM zoho_stock_summary 
WHERE "Name" IS NOT NULL
ORDER BY "Last Modified Time" DESC 
LIMIT 20;

-- 5. Check if there's a separate table for stock movements/transactions
SELECT tablename 
FROM pg_tables 
WHERE tablename ILIKE '%stock%' 
   OR tablename ILIKE '%inventory%'
   OR tablename ILIKE '%movement%';

-- 6. Check warehouse totals (including negatives)
SELECT 
    "Warehouse",
    SUM("Quantity") as total_quantity,
    SUM("Stock Value") as total_stock_value,
    SUM("Stock Value with VAT") as total_stock_value_vat,
    COUNT(*) as product_count,
    COUNT(CASE WHEN "Quantity" > 0 THEN 1 END) as positive_items,
    COUNT(CASE WHEN "Quantity" < 0 THEN 1 END) as negative_items
FROM zoho_stock_summary
WHERE "Name" IS NOT NULL AND "Warehouse" IS NOT NULL
GROUP BY "Warehouse"
ORDER BY total_stock_value DESC;