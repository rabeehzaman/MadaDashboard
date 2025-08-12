# Apply SEB VEHICLE Branch Filter

## Summary
This will filter out the **"SEB VEHICLE"** branch completely from all database views and functions, removing **7,796 records** from all dashboard data.

## Current Status
- **Total records**: 42,111
- **SEB VEHICLE records**: 7,796 (18.5% of data)
- **Total branches**: 7
- **After filtering**: 34,315 records from 6 branches

## Instructions

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects/tqsltmruwqluaeukgrbd)
2. Navigate to **SQL Editor**
3. Create a **New Query**

### Step 2: Execute the Filter Script
1. Copy the entire contents of `filter-seb-vehicle-complete.sql`
2. Paste into the SQL Editor
3. Click **Run** to execute all changes

### Step 3: Verify Changes
After execution, run this verification query:
```sql
SELECT * FROM verify_seb_vehicle_filtering();
```

Expected results should show:
- `profit_totals_view test`: PASS - SEB VEHICLE excluded
- `branch_list test`: PASS - SEB VEHICLE excluded from branches

### Step 4: Test Dashboard
1. Refresh the dashboard application
2. Verify SEB VEHICLE no longer appears in:
   - Branch filter dropdown
   - All KPI calculations
   - Data tables and charts
   - Branch performance reports

## What Gets Updated

### Database Views (2)
- ✅ `profit_totals_view` - Main aggregated totals
- ✅ `profit_by_branch_view` - Branch-wise data

### RPC Functions (25+)
- ✅ All dashboard KPI functions
- ✅ All profit analysis functions  
- ✅ All chart and analytics functions
- ✅ All filter option functions
- ✅ All paginated data functions

## Impact
- **Zero frontend changes needed** - all filtering at database level
- **18.5% reduction in data** - 7,796 records filtered out
- **Complete exclusion** - SEB VEHICLE will not appear anywhere
- **Performance maintained** - all existing indexes work normally

## Rollback
To undo these changes, remove all `WHERE "Branch Name" != 'SEB VEHICLE'` clauses from the views and functions.

## Verification Commands
```sql
-- Check current SEB VEHICLE count (should be 7796 before, 0 in results after)
SELECT COUNT(*) FROM profit_totals_view;

-- Check branches (should exclude SEB VEHICLE)
SELECT DISTINCT branch_name FROM profit_by_branch_view ORDER BY branch_name;

-- Verify filtering function
SELECT * FROM verify_seb_vehicle_filtering();
```