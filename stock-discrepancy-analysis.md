# Stock Value Discrepancy Analysis

## Issue
Stock value in KPI vs Stock Report table shows different values.

## Root Cause Analysis

### KPI Calculation (get_dashboard_kpis_2025)
```sql
(SELECT SUM(s."Stock Value with VAT") 
 FROM zoho_stock_summary s 
 WHERE s."Name" IS NOT NULL) as total_stock_value
```
- **Source**: Direct database aggregation
- **Scope**: All warehouses, all products
- **Filtering**: Only excludes records with NULL name

### Stock Report Table Calculation (optimized-tabbed-tables.tsx)
```javascript
totalCostWithVAT: displayStockData.reduce((sum, item) => sum + (item.stock_value_with_vat || 0), 0)
```
- **Source**: Client-side aggregation of filtered data
- **Scope**: Filtered by warehouse (if warehouse filter is applied)
- **Filtering**: May exclude certain warehouses based on user filter

## The Problem
1. **Different Scopes**: KPI shows ALL warehouses, stock table shows FILTERED warehouses
2. **Timing**: KPI uses server-side aggregation, table uses client-side aggregation of already filtered data

## The Solution
Both should show the same values when no filters are applied. When warehouse filter is applied, the stock table total should be less than or equal to the KPI total.

## Expected Behavior
- KPI Stock Value: Always shows total across ALL warehouses
- Stock Report Total: Shows total of currently visible/filtered data
- When no warehouse filter: Both should match
- When warehouse filter applied: Stock report total ≤ KPI total