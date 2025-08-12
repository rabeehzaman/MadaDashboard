-- ============================================================================
-- FILTER OUT SEB.COM VENDORS FROM ALL VENDOR VIEWS
-- This script excludes vendors with website = 'seb.com' from all vendor data
-- Execute this in Supabase SQL Editor to completely remove these vendors
-- ============================================================================

-- =============================================================================
-- 1. UPDATE VENDOR_BILLS_FILTERED VIEW TO EXCLUDE SEB.COM VENDORS
-- =============================================================================

-- Update vendor_bills_filtered to exclude vendors with website 'seb.com'
CREATE OR REPLACE VIEW vendor_bills_filtered AS
SELECT 
    b.bill_id,
    b.vendor_id,
    b.bill_status,
    b.bill_date,
    b.total_bcy,
    b.balance_bcy,
    b.age_in_days,
    v.vendor_name
FROM bills b
JOIN vendors v ON b.vendor_id = v.vendor_id
WHERE b.vendor_id IS NOT NULL 
    AND v.vendor_name <> 'OPENING BALANCE'
    AND (v.website IS NULL OR v.website != 'seb.com');

-- =============================================================================
-- 2. UPDATE VENDOR_BALANCE_AGING_VIEW TO EXCLUDE SEB.COM VENDORS
-- =============================================================================

-- Update vendor_balance_aging_view to exclude vendors with website 'seb.com'
CREATE OR REPLACE VIEW vendor_balance_aging_view AS
WITH parsed_bills AS (
    SELECT 
        bills.id,
        bills.bill_id,
        bills.bill_number,
        bills.bill_date,
        bills.bill_status,
        bills.sub_total_bcy,
        bills.total_bcy,
        bills.created_time,
        bills.vendor_id,
        bills.age_in_days,
        bills.age_in_tier,
        bills.due_date,
        bills.discount,
        bills.last_modified_time,
        bills.purchase_order,
        bills.currency_code,
        bills.exchange_rate,
        bills.balance_bcy,
        bills.bill_type,
        bills.created_at,
        bills.updated_at,
        CASE 
            WHEN bills.due_date IS NOT NULL AND bills.due_date <> '' THEN
                CASE 
                    WHEN bills.due_date ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4}$' THEN TO_DATE(bills.due_date, 'DD Mon YYYY')
                    WHEN bills.due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN bills.due_date::DATE
                    ELSE NULL
                END
            ELSE NULL
        END AS parsed_due_date,
        CASE 
            WHEN bills.bill_date IS NOT NULL AND bills.bill_date <> '' THEN
                CASE 
                    WHEN bills.bill_date ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4}$' THEN TO_DATE(bills.bill_date, 'DD Mon YYYY')
                    WHEN bills.bill_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN bills.bill_date::DATE
                    ELSE NULL
                END
            ELSE NULL
        END AS parsed_bill_date,
        CASE 
            WHEN bills.balance_bcy ~ '^[0-9]+\.?[0-9]*$' THEN bills.balance_bcy::NUMERIC
            ELSE COALESCE(NULLIF(REGEXP_REPLACE(bills.balance_bcy, '[^0-9.]', '', 'g'), '')::NUMERIC, 0)
        END AS parsed_balance
    FROM bills
    WHERE bills.bill_status NOT IN ('Paid', 'Closed')
),
bill_aging AS (
    SELECT 
        *,
        CASE 
            WHEN parsed_due_date IS NOT NULL THEN CURRENT_DATE - parsed_due_date
            WHEN parsed_bill_date IS NOT NULL THEN CURRENT_DATE - parsed_bill_date
            ELSE NULL
        END AS days_overdue
    FROM parsed_bills
)
SELECT 
    vendors.vendor_id AS "Vendor ID",
    vendors.vendor_name AS "Vendor Name",
    vendors.company_name AS "Company Name",
    vendors.status AS "Vendor Status",
    vendors.currency_code AS "Vendor Currency",
    COALESCE(SUM(bill_aging.parsed_balance), 0) AS "Total Outstanding",
    COALESCE(SUM(CASE WHEN days_overdue IS NULL OR days_overdue <= 30 THEN bill_aging.parsed_balance ELSE 0 END), 0) AS "Current (0-30 days)",
    COALESCE(SUM(CASE WHEN days_overdue > 30 AND days_overdue <= 60 THEN bill_aging.parsed_balance ELSE 0 END), 0) AS "31-60 Days",
    COALESCE(SUM(CASE WHEN days_overdue > 60 AND days_overdue <= 90 THEN bill_aging.parsed_balance ELSE 0 END), 0) AS "61-90 Days",
    COALESCE(SUM(CASE WHEN days_overdue > 90 AND days_overdue <= 120 THEN bill_aging.parsed_balance ELSE 0 END), 0) AS "91-120 Days",
    COALESCE(SUM(CASE WHEN days_overdue > 120 THEN bill_aging.parsed_balance ELSE 0 END), 0) AS "Over 120 Days",
    COUNT(bill_aging.bill_id) AS "Outstanding Bills Count",
    ROUND(AVG(CASE WHEN days_overdue IS NOT NULL THEN days_overdue ELSE NULL END), 0) AS "Avg Days Outstanding",
    MIN(CASE WHEN parsed_due_date IS NOT NULL THEN parsed_due_date WHEN parsed_bill_date IS NOT NULL THEN parsed_bill_date ELSE NULL END) AS "Oldest Due Date",
    MAX(bill_aging.parsed_bill_date) AS "Last Bill Date",
    COALESCE(bill_aging.currency_code, vendors.currency_code, 'SAR') AS "Currency",
    CASE 
        WHEN COALESCE(SUM(CASE WHEN days_overdue > 120 THEN bill_aging.parsed_balance ELSE 0 END), 0) > 0 THEN 'High Risk (120+ days)'
        WHEN COALESCE(SUM(bill_aging.parsed_balance), 0) > 0 THEN 'Medium Risk'
        ELSE 'No Outstanding'
    END AS "Risk Category"
FROM vendors
LEFT JOIN bill_aging ON vendors.vendor_id = bill_aging.vendor_id
WHERE (vendors.website IS NULL OR vendors.website != 'seb.com')
GROUP BY 
    vendors.vendor_id, 
    vendors.vendor_name, 
    vendors.company_name, 
    vendors.status, 
    vendors.currency_code, 
    bill_aging.currency_code
HAVING COALESCE(SUM(bill_aging.parsed_balance), 0) > 0
ORDER BY COALESCE(SUM(bill_aging.parsed_balance), 0) DESC, vendors.vendor_name;

-- =============================================================================
-- 3. CREATE VERIFICATION FUNCTION
-- =============================================================================

-- Create a function to verify the filtering is working
CREATE OR REPLACE FUNCTION verify_seb_vendor_filtering()
RETURNS TABLE(
    test_name TEXT,
    seb_vendors_count BIGINT,
    filtered_vendors_count BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Test 1: Check vendor_bills_filtered excludes seb.com vendors
    SELECT 
        'vendor_bills_filtered test'::TEXT,
        (SELECT COUNT(DISTINCT v.vendor_id) FROM vendors v WHERE v.website = 'seb.com') as seb_vendors_count,
        (SELECT COUNT(DISTINCT vendor_id) FROM vendor_bills_filtered) as filtered_vendors_count,
        CASE 
            WHEN (SELECT COUNT(DISTINCT vbf.vendor_id) 
                  FROM vendor_bills_filtered vbf 
                  JOIN vendors v ON vbf.vendor_id = v.vendor_id 
                  WHERE v.website = 'seb.com') = 0
            THEN 'PASS - seb.com vendors excluded'::TEXT
            ELSE 'FAIL - seb.com vendors still included'::TEXT
        END as status
    
    UNION ALL
    
    -- Test 2: Check vendor_balance_aging_view excludes seb.com vendors
    SELECT 
        'vendor_balance_aging_view test'::TEXT,
        (SELECT COUNT(DISTINCT v.vendor_id) FROM vendors v WHERE v.website = 'seb.com') as seb_vendors_count,
        (SELECT COUNT(*) FROM vendor_balance_aging_view) as filtered_vendors_count,
        CASE 
            WHEN (SELECT COUNT(*) 
                  FROM vendor_balance_aging_view vbav 
                  JOIN vendors v ON vbav."Vendor ID" = v.vendor_id 
                  WHERE v.website = 'seb.com') = 0
            THEN 'PASS - seb.com vendors excluded from aging view'::TEXT
            ELSE 'FAIL - seb.com vendors still in aging view'::TEXT
        END as status
    
    UNION ALL
    
    -- Test 3: List the excluded vendors
    SELECT 
        'excluded vendors list'::TEXT,
        (SELECT COUNT(*) FROM vendors WHERE website = 'seb.com') as seb_vendors_count,
        0::BIGINT as filtered_vendors_count,
        (SELECT STRING_AGG(vendor_name, ', ') FROM vendors WHERE website = 'seb.com') as status;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
-- This script has updated both vendor views to exclude vendors with website = 'seb.com'
-- Run verify_seb_vendor_filtering() to confirm the filtering is working correctly.
-- 
-- To test: SELECT * FROM verify_seb_vendor_filtering();
-- =============================================================================