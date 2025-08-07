-- ============================================================================
-- VENDOR BALANCE AGING VIEW SETUP
-- Execute this in Supabase SQL Editor to create the vendor_balance_aging_view
-- ============================================================================

-- 1. CREATE VENDOR BALANCE AGING VIEW
-- This view provides vendor payable aging analysis similar to customer receivable aging
-- ============================================================================
CREATE OR REPLACE VIEW vendor_balance_aging_view AS
SELECT 
  v.vendor_id,
  v.vendor_name,
  v.display_name,
  v.company_name,
  v.vendor_owner,
  v.vendor_owner_name,
  v.vendor_owner_email,
  COALESCE(v.vendor_owner_name, 'Unknown Owner') as vendor_owner_name_custom,
  
  -- Total payable amount
  COALESCE(SUM(b.amount_due), 0) as total_payable,
  
  -- Aging buckets for payables (0-30, 31-60, 61-90, 90+)
  COALESCE(SUM(CASE 
    WHEN EXTRACT(days FROM CURRENT_DATE - b.due_date) BETWEEN 0 AND 30 
    THEN b.amount_due 
    ELSE 0 
  END), 0) as current_0_30,
  
  COALESCE(SUM(CASE 
    WHEN EXTRACT(days FROM CURRENT_DATE - b.due_date) BETWEEN 31 AND 60 
    THEN b.amount_due 
    ELSE 0 
  END), 0) as past_due_31_60,
  
  COALESCE(SUM(CASE 
    WHEN EXTRACT(days FROM CURRENT_DATE - b.due_date) BETWEEN 61 AND 90 
    THEN b.amount_due 
    ELSE 0 
  END), 0) as past_due_61_90,
  
  COALESCE(SUM(CASE 
    WHEN EXTRACT(days FROM CURRENT_DATE - b.due_date) > 90 
    THEN b.amount_due 
    ELSE 0 
  END), 0) as past_due_over_90,
  
  -- Additional metrics
  COUNT(b.bill_id) as total_bills,
  MAX(b.bill_date) as last_bill_date,
  COALESCE(v.vendor_status, 'Active') as vendor_status

FROM vendors v
LEFT JOIN bills b ON v.vendor_id = b.vendor_id
WHERE b.amount_due > 0 OR b.amount_due IS NULL
GROUP BY 
  v.vendor_id, 
  v.vendor_name, 
  v.display_name, 
  v.company_name,
  v.vendor_owner,
  v.vendor_owner_name,
  v.vendor_owner_email,
  v.vendor_status
ORDER BY total_payable DESC;

-- 2. CREATE SAMPLE VENDOR BALANCE AGING DATA (for testing)
-- This creates a vendor_balance_aging table with sample data if the actual vendor/bills tables don't exist
-- ============================================================================

-- Check if the view creation failed (likely because vendor/bills tables don't exist)
-- If so, create a sample table for testing
DO $$
BEGIN
  -- Try to select from the view to check if it works
  PERFORM 1 FROM vendor_balance_aging_view LIMIT 1;
EXCEPTION
  WHEN OTHERS THEN
    -- If the view doesn't work, create a sample table instead
    CREATE TABLE IF NOT EXISTS vendor_balance_aging (
      vendor_id TEXT PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      display_name TEXT,
      company_name TEXT,
      vendor_owner TEXT,
      vendor_owner_name TEXT,
      vendor_owner_email TEXT,
      vendor_owner_name_custom TEXT,
      total_payable DECIMAL(15,2) DEFAULT 0,
      current_0_30 DECIMAL(15,2) DEFAULT 0,
      past_due_31_60 DECIMAL(15,2) DEFAULT 0,
      past_due_61_90 DECIMAL(15,2) DEFAULT 0,
      past_due_over_90 DECIMAL(15,2) DEFAULT 0,
      total_bills INTEGER DEFAULT 0,
      last_bill_date DATE,
      vendor_status TEXT DEFAULT 'Active'
    );

    -- Insert sample vendor data
    INSERT INTO vendor_balance_aging (
      vendor_id, vendor_name, display_name, vendor_owner_name_custom,
      total_payable, current_0_30, past_due_31_60, past_due_61_90, past_due_over_90,
      total_bills, last_bill_date, vendor_status
    ) VALUES 
    ('V001', 'ABC Trading Company', 'ABC Trading Company', 'Purchase Manager', 15750.00, 8500.00, 4200.00, 2250.00, 800.00, 12, '2025-01-25', 'Active'),
    ('V002', 'XYZ Suppliers Ltd', 'XYZ Suppliers Ltd', 'Purchase Manager', 23400.00, 15600.00, 5200.00, 1800.00, 800.00, 18, '2025-01-20', 'Active'),
    ('V003', 'Global Materials Inc', 'Global Materials Inc', 'Procurement Team', 9800.00, 6500.00, 2100.00, 900.00, 300.00, 8, '2025-01-15', 'Active'),
    ('V004', 'Regional Distributors', 'Regional Distributors', 'Purchase Manager', 31200.00, 18700.00, 8500.00, 3200.00, 800.00, 25, '2025-01-28', 'Active'),
    ('V005', 'Tech Solutions Provider', 'Tech Solutions Provider', 'IT Procurement', 12600.00, 7800.00, 3400.00, 1100.00, 300.00, 6, '2025-01-10', 'Active'),
    ('V006', 'Office Supplies Co', 'Office Supplies Co', 'Admin Team', 5200.00, 3900.00, 800.00, 400.00, 100.00, 15, '2025-01-22', 'Active'),
    ('V007', 'Maintenance Services', 'Maintenance Services', 'Facilities Team', 8900.00, 5200.00, 2400.00, 1000.00, 300.00, 10, '2025-01-18', 'Active'),
    ('V008', 'Equipment Rental Corp', 'Equipment Rental Corp', 'Operations Team', 18500.00, 11200.00, 4800.00, 2200.00, 300.00, 9, '2025-01-12', 'Active'),
    ('V009', 'Logistics Partners', 'Logistics Partners', 'Supply Chain', 14300.00, 9100.00, 3600.00, 1200.00, 400.00, 22, '2025-01-26', 'Active'),
    ('V010', 'Marketing Services Ltd', 'Marketing Services Ltd', 'Marketing Team', 7800.00, 4500.00, 2100.00, 900.00, 300.00, 7, '2025-01-14', 'Active')
    ON CONFLICT (vendor_id) DO NOTHING;

    -- Create the view pointing to the table instead
    CREATE OR REPLACE VIEW vendor_balance_aging_view AS
    SELECT * FROM vendor_balance_aging;

END $$;

-- 3. VERIFICATION QUERY
-- Run this to test the setup
-- ============================================================================
-- SELECT * FROM vendor_balance_aging_view LIMIT 10;

-- ============================================================================
-- NOTES:
-- 1. If you have actual vendor and bills tables, modify the first view creation
--    to match your actual table structure and column names
-- 2. The sample data provides realistic vendor aging scenarios for testing
-- 3. The view will show vendors with their payable aging in the format:
--    Vendor Name | Total Payable | 0-30 Days | 31-60 Days | 61-90 Days | 90+ Days
-- ============================================================================