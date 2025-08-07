-- Debug: Check what RPC functions exist and test them
-- Run these queries in Supabase SQL Editor to debug

-- 1. Check if the new functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%2025%';

-- 2. Test the old functions to see if they still work
SELECT * FROM get_dashboard_kpis(NULL, NULL, NULL) LIMIT 1;

-- 3. Test if profit_analysis_view_current has data
SELECT COUNT(*) as total_records FROM profit_analysis_view_current;

-- 4. Test if profit_analysis_view_current has 2025 data
SELECT COUNT(*) as records_2025 
FROM profit_analysis_view_current 
WHERE "Inv Date"::DATE >= '2025-01-01';

-- 5. Check date range in the data
SELECT 
    MIN("Inv Date"::DATE) as earliest_date,
    MAX("Inv Date"::DATE) as latest_date,
    COUNT(*) as total_records
FROM profit_analysis_view_current 
WHERE "Inv Date" IS NOT NULL;

-- 6. Test the new 2025 function
SELECT * FROM get_profit_by_item_2025(NULL, NULL, NULL, NULL, NULL, NULL, 5, 0);

-- 7. Check if zoho_stock_summary has data
SELECT COUNT(*) FROM zoho_stock_summary WHERE "Name" IS NOT NULL;