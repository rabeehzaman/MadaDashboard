-- Check the actual column names in zoho_stock_summary table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'zoho_stock_summary' 
ORDER BY ordinal_position;

-- Also check a sample of the actual data to see column names
SELECT * FROM zoho_stock_summary LIMIT 3;