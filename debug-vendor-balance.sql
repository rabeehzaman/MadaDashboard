-- Debug queries for BAYADER FOOD CO vendor balance issue
-- =====================================================

-- 1. First, let's find the vendor_id for BAYADER FOOD CO
SELECT vendor_id, vendor_name, vendor_status
FROM vendors
WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%';

-- 2. Check all bills for BAYADER FOOD CO (without any filters)
-- This will show ALL bills regardless of balance
WITH bayader_vendor AS (
  SELECT vendor_id 
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
)
SELECT 
  b.bill_id,
  b.bill_number,
  b.bill_date,
  b.bill_status,
  b.total_bcy,
  b.balance_bcy,
  b.age_in_days,
  v.vendor_name,
  CASE 
    WHEN b.balance_bcy IS NULL THEN 'NULL balance_bcy'
    WHEN b.balance_bcy = '0' THEN 'Zero balance'
    WHEN b.balance_bcy = '' THEN 'Empty string'
    ELSE 'Has balance'
  END as balance_status
FROM bills b
JOIN vendors v ON b.vendor_id = v.vendor_id
WHERE b.vendor_id IN (SELECT vendor_id FROM bayader_vendor)
ORDER BY b.bill_date DESC;

-- 3. Check what the vendor_bills_filtered view returns for BAYADER
WITH bayader_vendor AS (
  SELECT vendor_id 
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
)
SELECT *
FROM vendor_bills_filtered
WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
ORDER BY bill_date DESC;

-- 4. Compare total bills vs filtered bills
WITH bayader_vendor AS (
  SELECT vendor_id 
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
),
all_bills AS (
  SELECT 
    COUNT(*) as total_bills,
    SUM(CAST(REPLACE(REPLACE(total_bcy, 'SAR ', ''), ',', '') AS DECIMAL)) as total_amount,
    SUM(CAST(REPLACE(REPLACE(balance_bcy, 'SAR ', ''), ',', '') AS DECIMAL)) as total_balance
  FROM bills
  WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
),
filtered_bills AS (
  SELECT 
    COUNT(*) as filtered_bills,
    SUM(CAST(REPLACE(REPLACE(total_bcy, 'SAR ', ''), ',', '') AS DECIMAL)) as filtered_total,
    SUM(CAST(REPLACE(REPLACE(balance_bcy, 'SAR ', ''), ',', '') AS DECIMAL)) as filtered_balance
  FROM vendor_bills_filtered
  WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
)
SELECT 
  'All Bills' as source,
  total_bills as bill_count,
  total_amount,
  total_balance
FROM all_bills
UNION ALL
SELECT 
  'Filtered Bills' as source,
  filtered_bills as bill_count,
  filtered_total,
  filtered_balance
FROM filtered_bills;

-- 5. Check for any bills that might be excluded due to NULL or empty values
WITH bayader_vendor AS (
  SELECT vendor_id 
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
)
SELECT 
  'Bills with NULL vendor_id' as issue,
  COUNT(*) as count
FROM bills
WHERE vendor_id IS NULL
  AND bill_number IN (
    SELECT bill_number 
    FROM bills 
    WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
  )
UNION ALL
SELECT 
  'Bills with NULL balance_bcy' as issue,
  COUNT(*) as count
FROM bills
WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
  AND (balance_bcy IS NULL OR balance_bcy = '')
UNION ALL
SELECT 
  'Bills with zero balance_bcy' as issue,
  COUNT(*) as count
FROM bills
WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
  AND balance_bcy = '0'
UNION ALL
SELECT 
  'Bills excluded by OPENING BALANCE filter' as issue,
  COUNT(*) as count
FROM bills b
JOIN vendors v ON b.vendor_id = v.vendor_id
WHERE v.vendor_name = 'OPENING BALANCE';

-- 6. Check payment history for BAYADER bills
WITH bayader_vendor AS (
  SELECT vendor_id 
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
),
bayader_bills AS (
  SELECT bill_id, bill_number, total_bcy, balance_bcy
  FROM bills
  WHERE vendor_id IN (SELECT vendor_id FROM bayader_vendor)
)
SELECT 
  b.bill_number,
  b.total_bcy as bill_total,
  b.balance_bcy as bill_balance,
  COUNT(p.payment_id) as payment_count,
  SUM(CAST(REPLACE(REPLACE(p.amount_bcy, 'SAR ', ''), ',', '') AS DECIMAL)) as total_payments
FROM bayader_bills b
LEFT JOIN payments_made p ON b.bill_id = p.bill_id
GROUP BY b.bill_id, b.bill_number, b.total_bcy, b.balance_bcy
ORDER BY b.bill_number;

-- 7. Detailed calculation check - what the component would calculate
WITH bayader_vendor AS (
  SELECT vendor_id, vendor_name
  FROM vendors 
  WHERE UPPER(vendor_name) LIKE '%BAYADER%FOOD%'
)
SELECT 
  v.vendor_name,
  COUNT(DISTINCT b.bill_id) as bill_count,
  COUNT(CASE WHEN b.balance_bcy IS NOT NULL AND b.balance_bcy != '' AND b.balance_bcy != '0' THEN 1 END) as bills_with_balance,
  SUM(
    CASE 
      WHEN b.balance_bcy IS NULL OR b.balance_bcy = '' THEN 0
      ELSE CAST(REPLACE(REPLACE(b.balance_bcy, 'SAR ', ''), ',', '') AS DECIMAL)
    END
  ) as calculated_total_outstanding
FROM vendor_bills_filtered b
JOIN bayader_vendor v ON b.vendor_id = v.vendor_id
GROUP BY v.vendor_name;