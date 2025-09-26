// =============================================================================
// OPTIMIZED DATABASE LAYER - Uses new views and RPC functions
// =============================================================================
// This replaces the old data fetching with the new optimized database views
// and RPC functions that ensure perfect data consistency between KPIs and tables
// =============================================================================

import { supabase } from './supabase'
import { formatDateLocal } from './utils'

// =============================================================================
// ACTIVE BRANCHES API
// =============================================================================

export async function getActiveBranches(startDate?: Date, endDate?: Date): Promise<string[]> {
  try {
    console.log('🔍 DEBUG: Building getActiveBranches query...')
    // Use profit_analysis_view_current to get branches with transactions in date range
    let query = supabase
      .from('profit_analysis_view_current')
      .select('"Branch Name"')
      .not('"Branch Name"', 'is', null)
      .in('"Branch Name"', ['Asir S Man', 'Main Branch', 'Rashid S Man', 'MAJEED'])
    
    console.log('🔍 DEBUG: Initial query built, column selected: "Branch Name"')

    // Apply date range filter if provided
    if (startDate) {
      const fromDate = formatDateLocal(startDate)
      query = query.gte('"Inv Date"', fromDate)
    }
    
    if (endDate) {
      const toDate = formatDateLocal(endDate)
      query = query.lte('"Inv Date"', toDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching active branches from profit_analysis_view_current:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      return []
    }

    // Get unique branch names and sort them
    const uniqueBranches = Array.from(
      new Set(data?.map(item => item['Branch Name']) || [])
    ).sort()

    return uniqueBranches
  } catch (error) {
    console.error('Error in getActiveBranches:', error)
    return []
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface OptimizedKPIs {
  total_revenue: number
  total_taxable_sales: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  gross_profit_percentage: number
  total_quantity: number
  total_line_items: number
  total_invoices: number
  unique_customers: number
  active_branches: number
  average_order_value: number
  earliest_transaction: string
  latest_transaction: string
  total_stock_value: number
  gross_profit: number
  daily_avg_sales: number
}

export interface OptimizedTransaction {
  inv_no: string
  inv_date: string
  item: string
  qty: number
  sale_price: number
  sale_with_vat: number
  cost: number
  profit: number
  profit_percent: number
  customer_name: string
  branch_name: string
  unit_price: number
  unit_cost: number
  unit_profit: number
  sales_person_name: string
  invoice_status: string
  total_count?: number
}

export interface OptimizedCustomer {
  customer_name: string
  total_invoices: number
  total_quantity: number
  total_sale_price: number
  total_sale_with_vat: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  first_transaction_date: string
  last_transaction_date: string
  total_line_items: number
}

export interface OptimizedInvoice {
  invoice_no: string
  inv_date: string
  customer_name: string
  branch_name: string
  line_items_count: number
  total_quantity: number
  total_sale_price: number
  total_sale_with_vat: number
  total_cost: number
  total_profit: number
  profit_margin_percent: number
  total_count?: number
}

export interface OptimizedStock {
  product_name: string
  warehouse: string
  unit: string
  stock_quantity: number
  stock_in_pieces: number
  current_stock_value: number
  stock_value_with_vat: number
  unit_cost: number
  vat_amount: number
}

export interface PaginationInfo {
  totalCount: number
  pageSize: number
  currentOffset: number
  hasMore: boolean
  totalPages: number
}

// =============================================================================
// KPI FUNCTIONS
// =============================================================================

/**
 * Get dashboard KPIs using the optimized RPC function for 2025 data only
 * This ensures KPIs match table totals exactly and improves performance
 */
export async function getOptimizedKPIs(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<OptimizedKPIs | null> {
  try {
    console.log('🎯 Fetching KPIs with 2025-only RPC:', { startDate, endDate, branchFilter })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_dashboard_kpis_2025_filtered', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    // If 2025 function doesn't exist or returns no data, try the original function
    if (error || !data || data.length === 0) {
      console.log('⚠️ 2025 function failed, trying original function:', error?.message)
      const fallback = await supabase.rpc('get_dashboard_kpis', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching optimized KPIs:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No KPI data returned')
      return null
    }

    const kpis = data[0] // RPC returns array, but we want the single aggregated result
    console.log('✅ Optimized KPIs loaded:', {
      totalRevenue: kpis.total_revenue,
      totalProfit: kpis.total_profit,
      totalInvoices: kpis.total_invoices,
      recordsUsed: 'All (no 1000 record limit)'
    })

    return kpis
  } catch (error) {
    console.error('❌ Exception fetching optimized KPIs:', error)
    return null
  }
}

// =============================================================================
// TOTALS FUNCTIONS (for accurate totals regardless of pagination)
// =============================================================================

export interface ProfitByItemTotals {
  total_records: number
  total_qty: number
  total_sale_price: number
  total_sale_with_vat: number
  total_cost: number
  total_profit: number
}

export interface ProfitByInvoiceTotals {
  total_invoices: number
  total_line_items: number
  total_quantity: number
  total_sale_price: number
  total_sale_with_vat: number
  total_cost: number
  total_profit: number
}

/**
 * Get accurate totals for profit by item (regardless of pagination/search)
 */
export async function getProfitByItemTotals(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  searchQuery?: string
): Promise<ProfitByItemTotals | null> {
  try {
    console.log('📊 Fetching profit by item totals:', { startDate, endDate, branchFilter, searchQuery })

    const { data, error } = await supabase.rpc('get_profit_by_item_totals', {
      start_date: startDate || null,
      end_date: endDate || null,
      branch_filter: branchFilter || null,
      search_query: searchQuery || null
    })

    if (error) {
      console.error('❌ Error fetching profit by item totals:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No profit by item totals returned')
      return null
    }

    console.log('✅ Profit by item totals loaded:', data[0])
    return data[0]
  } catch (error) {
    console.error('❌ Exception fetching profit by item totals:', error)
    return null
  }
}

/**
 * Get accurate totals for profit by invoice (regardless of pagination/search)
 */
export async function getProfitByInvoiceTotals(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  searchQuery?: string
): Promise<ProfitByInvoiceTotals | null> {
  try {
    console.log('📋 Fetching profit by invoice totals:', { startDate, endDate, branchFilter, searchQuery })

    const { data, error } = await supabase.rpc('get_profit_by_invoice_totals', {
      start_date: startDate || null,
      end_date: endDate || null,
      branch_filter: branchFilter || null,
      search_query: searchQuery || null
    })

    if (error) {
      console.error('❌ Error fetching profit by invoice totals:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No profit by invoice totals returned')
      return null
    }

    console.log('✅ Profit by invoice totals loaded:', data[0])
    return data[0]
  } catch (error) {
    console.error('❌ Exception fetching profit by invoice totals:', error)
    return null
  }
}

// =============================================================================
// TABLE DATA FUNCTIONS
// =============================================================================

/**
 * Get profit by item data with filtering and pagination (2025 data only)
 */
export async function getOptimizedProfitByItem(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  itemFilter?: string,
  customerFilter?: string,
  invoiceFilter?: string,
  pageLimit: number = 10000,
  pageOffset: number = 0
): Promise<{ data: OptimizedTransaction[], pagination: PaginationInfo } | null> {
  try {
    console.log('📊 Fetching profit by item (2025 only):', { startDate, endDate, branchFilter, itemFilter, customerFilter, invoiceFilter, pageLimit, pageOffset })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_profit_by_item_2025_filtered', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      item_filter: itemFilter || null,
      customer_filter: customerFilter || null,
      invoice_filter: invoiceFilter || null,
      page_limit: pageLimit,
      page_offset: pageOffset
    })

    // If 2025 function doesn't exist or returns no data, try the original function
    if (error || !data || data.length === 0) {
      console.log('⚠️ get_profit_by_item_2025_filtered failed, trying original function:', error?.message)
      // Build a search query from the filters for the original function
      let searchQuery = null
      if (itemFilter) searchQuery = itemFilter
      else if (customerFilter) searchQuery = customerFilter  
      else if (invoiceFilter) searchQuery = invoiceFilter

      const fallback = await supabase.rpc('get_profit_by_item_filtered', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null,
        search_query: searchQuery,
        page_limit: pageLimit,
        page_offset: pageOffset
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching profit by item:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No profit by item data returned from RPC')
      return {
        data: [],
        pagination: {
          totalCount: 0,
          pageSize: pageLimit,
          currentOffset: pageOffset,
          hasMore: false,
          totalPages: 0
        }
      }
    }

    const totalCount = data[0]?.total_count || 0
    const totalPages = Math.ceil(totalCount / pageLimit)
    const hasMore = pageOffset + pageLimit < totalCount

    console.log('✅ Profit by item loaded:', { records: data.length, totalCount })

    return {
      data,
      pagination: {
        totalCount,
        pageSize: pageLimit,
        currentOffset: pageOffset,
        hasMore,
        totalPages
      }
    }
  } catch (error) {
    console.error('❌ Exception fetching profit by item:', error)
    return null
  }
}

/**
 * Get profit by customer data with filtering (2025 data only)
 */
export async function getOptimizedProfitByCustomer(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  customerFilter?: string
): Promise<OptimizedCustomer[] | null> {
  try {
    console.log('👥 Fetching profit by customer (2025 only):', { startDate, endDate, branchFilter, customerFilter })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_profit_by_customer_2025', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      customer_filter: customerFilter || null
    })

    // If 2025 function doesn't exist or returns no data, try the original function
    if (error || !data || data.length === 0) {
      console.log('⚠️ get_profit_by_customer_2025 failed, trying original function:', error?.message)
      const fallback = await supabase.rpc('get_profit_by_customer_filtered', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null,
        search_query: customerFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching profit by customer:', error)
      return null
    }

    console.log('✅ Profit by customer loaded:', { customers: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching profit by customer:', error)
    return null
  }
}

/**
 * Get profit by invoice data with filtering and pagination (2025 data only)
 */
export async function getOptimizedProfitByInvoice(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  customerFilter?: string,
  invoiceFilter?: string,
  pageLimit: number = 10000,
  pageOffset: number = 0
): Promise<{ data: OptimizedInvoice[], pagination: PaginationInfo } | null> {
  try {
    console.log('📋 Fetching profit by invoice (2025 only):', { startDate, endDate, branchFilter, customerFilter, invoiceFilter, pageLimit, pageOffset })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_profit_by_invoice_2025_filtered', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      customer_filter: customerFilter || null,
      invoice_filter: invoiceFilter || null,
      page_limit: pageLimit,
      page_offset: pageOffset
    })

    // If 2025 function doesn't exist or returns no data, try the original function
    if (error || !data || data.length === 0) {
      console.log('⚠️ get_profit_by_invoice_2025_filtered failed, trying original function:', error?.message)
      // Build a search query from the filters for the original function
      let searchQuery = null
      if (customerFilter) searchQuery = customerFilter
      else if (invoiceFilter) searchQuery = invoiceFilter

      const fallback = await supabase.rpc('get_profit_by_invoice_filtered', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null,
        search_query: searchQuery,
        page_limit: pageLimit,
        page_offset: pageOffset
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching profit by invoice:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No profit by invoice data returned from RPC')
      return {
        data: [],
        pagination: {
          totalCount: 0,
          pageSize: pageLimit,
          currentOffset: pageOffset,
          hasMore: false,
          totalPages: 0
        }
      }
    }

    const totalCount = data[0]?.total_count || 0
    const totalPages = Math.ceil(totalCount / pageLimit)
    const hasMore = pageOffset + pageLimit < totalCount

    console.log('✅ Profit by invoice loaded:', { records: data.length, totalCount })

    // Map the RPC response fields to match our interface
    const mappedData = data.map((item: Record<string, unknown>) => ({
      invoice_no: item.inv_no || item.invoice_no,
      inv_date: item.inv_date,
      customer_name: item.customer_name,
      branch_name: item.branch_name,
      line_items_count: item.line_items_count || 0,
      total_quantity: item.total_quantity,
      total_sale_price: item.total_sale_price,
      total_sale_with_vat: item.total_sale_with_vat,
      total_cost: item.total_cost,
      total_profit: item.total_profit,
      profit_margin_percent: item.profit_margin || item.profit_margin_percent,
      total_count: item.total_count || totalCount
    }))

    return {
      data: mappedData,
      pagination: {
        totalCount,
        pageSize: pageLimit,
        currentOffset: pageOffset,
        hasMore,
        totalPages
      }
    }
  } catch (error) {
    console.error('❌ Exception fetching profit by invoice:', error)
    return null
  }
}

/**
 * Get stock report data with warehouse filtering
 */
export async function getOptimizedStockReport(warehouseFilter?: string): Promise<OptimizedStock[] | null> {
  try {
    console.log('📦 Fetching stock report with warehouse filter:', { warehouseFilter })

    // Try aggregated function first
    let { data, error } = await supabase.rpc('get_stock_report_aggregated', {
      warehouse_filter: warehouseFilter || null
    })

    // If aggregated function doesn't exist, try the filtered function
    if (error) {
      console.log('⚠️ get_stock_report_aggregated failed, trying get_stock_report_filtered:', error?.message)
      const fallback = await supabase.rpc('get_stock_report_filtered', {
        warehouse_filter: warehouseFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    // If filtered function doesn't exist, try the original view
    if (error) {
      console.log('⚠️ get_stock_report_filtered failed, trying stock_report_view:', error?.message)
      let query = supabase.from('stock_report_view').select('*').order('product_name', { ascending: true })

      if (warehouseFilter) {
        query = query.eq('warehouse', warehouseFilter)
      }

      const fallback = await query
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching stock report:', error)
      return null
    }

    console.log('✅ Stock report loaded:', {
      items: data?.length || 0,
      aggregated: !warehouseFilter ? 'yes' : 'no',
      warehouse: warehouseFilter || 'All'
    })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching stock report:', error)
    return null
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert date range to string format for RPC functions
 * Uses local timezone to avoid date shifting issues
 */
export function formatDateForRPC(date: Date): string {
  return formatDateLocal(date)
}

/**
 * Test all optimized functions to verify they're working
 */
export async function testOptimizedFunctions(): Promise<{
  kpis: boolean
  profitByItem: boolean
  profitByCustomer: boolean
  profitByInvoice: boolean
  stockReport: boolean
}> {
  console.log('🧪 Testing all optimized database functions...')

  const results = {
    kpis: false,
    profitByItem: false,
    profitByCustomer: false,
    profitByInvoice: false,
    stockReport: false
  }

  try {
    // Test KPIs
    const kpis = await getOptimizedKPIs()
    results.kpis = kpis !== null
    console.log('KPIs test:', results.kpis ? '✅' : '❌')

    // Test profit by item
    const items = await getOptimizedProfitByItem(undefined, undefined, undefined, undefined, undefined, undefined, 5, 0)
    results.profitByItem = items !== null
    console.log('Profit by item test:', results.profitByItem ? '✅' : '❌')

    // Test profit by customer
    const customers = await getOptimizedProfitByCustomer(undefined, undefined, undefined, undefined)
    results.profitByCustomer = customers !== null
    console.log('Profit by customer test:', results.profitByCustomer ? '✅' : '❌')

    // Test profit by invoice
    const invoices = await getOptimizedProfitByInvoice(undefined, undefined, undefined, undefined, undefined, 5, 0)
    results.profitByInvoice = invoices !== null
    console.log('Profit by invoice test:', results.profitByInvoice ? '✅' : '❌')

    // Test stock report
    const stock = await getOptimizedStockReport(undefined)
    results.stockReport = stock !== null
    console.log('Stock report test:', results.stockReport ? '✅' : '❌')

  } catch (error) {
    console.error('❌ Error testing optimized functions:', error)
  }

  const allPassed = Object.values(results).every(result => result)
  console.log('🎯 All tests passed:', allPassed ? '✅' : '❌')

  return results
}

// =============================================================================
// CHART DATA FUNCTIONS
// =============================================================================

export interface DailyRevenueTrend {
  date_key: string
  daily_revenue: number
  daily_profit: number
  daily_invoices: number
  profit_margin_percent: number
}

export interface TopProduct {
  product_name: string
  total_revenue: number
  total_quantity: number
  total_profit: number
  profit_margin_percent: number
  invoice_count: number
}

export interface TopCustomer {
  customer_name: string
  total_revenue: number
  total_profit: number
  profit_margin_percent: number
  invoice_count: number
  avg_order_value: number
}

export interface MonthlyComparison {
  month_key: string
  year_val: number
  month_val: number
  monthly_revenue: number
  monthly_profit: number
  monthly_invoices: number
  profit_margin_percent: number
  avg_daily_revenue: number
}

export interface BranchPerformance {
  branch_name: string
  total_revenue: number
  total_profit: number
  profit_margin_percent: number
  invoice_count: number
  avg_order_value: number
  unique_customers: number
}

export interface ProfitMarginDistribution {
  margin_range: string
  item_count: number
  total_revenue: number
  percentage_of_total: number
}

export interface WeeklyPerformance {
  day_of_week: number
  day_name: string
  total_revenue: number
  total_invoices: number
  avg_order_value: number
}

export interface StockByWarehouse {
  warehouse_name: string
  total_stock_value: number
  total_stock_value_with_vat: number
  product_count: number
  total_quantity: number
  avg_unit_cost: number
}

/**
 * Get daily revenue trend data for line chart
 */
export async function getDailyRevenueTrend(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<DailyRevenueTrend[] | null> {
  try {
    console.log('📈 Fetching daily revenue trend:', { startDate, endDate, branchFilter })

    // Try the new chart function first
    let { data, error } = await supabase.rpc('get_daily_revenue_trend', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    // If the function doesn't exist, create fallback data from existing profit data
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      console.log('⚠️ Chart function does not exist, creating fallback data from profit_analysis_view_current')
      
      // Get data from existing view and aggregate by date
      const fallbackQuery = supabase
        .from('profit_analysis_view_current')
        .select('*')
        .gte('Inv Date', startDate || '2025-01-01')
        .lte('Inv Date', endDate || formatDateLocal(new Date()))
      
      if (branchFilter) {
        fallbackQuery.eq('Branch Name', branchFilter)
      }
      
      const { data: rawData, error: fallbackError } = await fallbackQuery
      
      if (fallbackError) {
        console.error('❌ Fallback query failed:', fallbackError)
        return []
      }
      
      if (!rawData || rawData.length === 0) {
        console.log('⚠️ No fallback data available')
        return []
      }
      
      // Aggregate data by date
      const dateMap = new Map<string, {
        daily_revenue: number
        daily_profit: number
        daily_invoices: Set<string>
      }>()
      
      rawData.forEach(row => {
        const date = row['Inv Date']?.split('T')[0] || row['Inv Date']
        if (!date) return
        
        const revenue = Number(row['Sale Price']) || 0
        const cost = Number(row['Cost']) || 0
        const profit = revenue - cost
        const invoiceNo = row['Inv No']
        
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            daily_revenue: 0,
            daily_profit: 0,
            daily_invoices: new Set()
          })
        }
        
        const dayData = dateMap.get(date)!
        dayData.daily_revenue += revenue
        dayData.daily_profit += profit
        if (invoiceNo) dayData.daily_invoices.add(invoiceNo)
      })
      
      // Convert to chart data format
      data = Array.from(dateMap.entries()).map(([date, values]) => ({
        date_key: date,
        daily_revenue: values.daily_revenue,
        daily_profit: values.daily_profit,
        daily_invoices: values.daily_invoices.size,
        profit_margin_percent: values.daily_revenue > 0 ? 
          ((values.daily_profit / values.daily_revenue) * 100) : 0
      })).sort((a, b) => a.date_key.localeCompare(b.date_key))
      
      error = null
    }

    if (error) {
      console.error('❌ Error fetching daily revenue trend:', error)
      return []
    }

    console.log('✅ Daily revenue trend loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching daily revenue trend:', error)
    return []
  }
}

/**
 * Get top selling products data for bar chart
 */
export async function getTopSellingProducts(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  limit: number = 10
): Promise<TopProduct[] | null> {
  try {
    console.log('🏆 Fetching top selling products:', { startDate, endDate, branchFilter, limit })

    const { data, error } = await supabase.rpc('get_top_selling_products', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      limit_count: limit
    })

    if (error) {
      console.error('❌ Error fetching top selling products:', error)
      return null
    }

    console.log('✅ Top selling products loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching top selling products:', error)
    return null
  }
}

/**
 * Get top customers data for bar chart
 */
export async function getTopCustomers(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  limit: number = 10
): Promise<TopCustomer[] | null> {
  try {
    console.log('👥 Fetching top customers:', { startDate, endDate, branchFilter, limit })

    const { data, error } = await supabase.rpc('get_top_customers_chart', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      limit_count: limit
    })

    if (error) {
      console.error('❌ Error fetching top customers:', error)
      return null
    }

    console.log('✅ Top customers loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching top customers:', error)
    return null
  }
}

/**
 * Get monthly revenue comparison data for line chart
 */
export async function getMonthlyRevenueComparison(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<MonthlyComparison[] | null> {
  try {
    console.log('📊 Fetching monthly revenue comparison:', { startDate, endDate, branchFilter })

    const { data, error } = await supabase.rpc('get_monthly_revenue_comparison', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    if (error) {
      console.error('❌ Error fetching monthly revenue comparison:', error)
      return null
    }

    console.log('✅ Monthly revenue comparison loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching monthly revenue comparison:', error)
    return null
  }
}

/**
 * Get branch performance data for comparison chart
 */
export async function getBranchPerformance(
  startDate?: string,
  endDate?: string
): Promise<BranchPerformance[] | null> {
  try {
    console.log('🏢 Fetching branch performance:', { startDate, endDate })

    const { data, error } = await supabase.rpc('get_branch_performance_chart', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || new Date().toISOString().split('T')[0]
    })

    if (error) {
      console.error('❌ Error fetching branch performance:', error)
      return null
    }

    console.log('✅ Branch performance loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching branch performance:', error)
    return null
  }
}

/**
 * Get profit margin distribution for pie chart
 */
export async function getProfitMarginDistribution(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  analysisType: 'products' | 'customers' = 'products'
): Promise<ProfitMarginDistribution[] | null> {
  try {
    console.log('📊 Fetching profit margin distribution:', { startDate, endDate, branchFilter, analysisType })

    const { data, error } = await supabase.rpc('get_profit_margin_distribution', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null,
      analysis_type: analysisType
    })

    if (error) {
      console.error('❌ Error fetching profit margin distribution:', error)
      return null
    }

    console.log('✅ Profit margin distribution loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching profit margin distribution:', error)
    return null
  }
}

/**
 * Get weekly performance data for heatmap
 */
export async function getWeeklyPerformance(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<WeeklyPerformance[] | null> {
  try {
    console.log('📅 Fetching weekly performance:', { startDate, endDate, branchFilter })

    const { data, error } = await supabase.rpc('get_weekly_performance_heatmap', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    if (error) {
      console.error('❌ Error fetching weekly performance:', error)
      return null
    }

    console.log('✅ Weekly performance loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching weekly performance:', error)
    return null
  }
}

/**
 * Get stock by warehouse data for pie chart
 */
export async function getStockByWarehouse(): Promise<StockByWarehouse[] | null> {
  try {
    console.log('🏪 Fetching stock by warehouse')

    // Try the chart function first
    let { data, error } = await supabase.rpc('get_stock_by_warehouse_chart')

    // If the function doesn't exist, create fallback data from existing stock data
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      console.log('⚠️ Stock chart function does not exist, creating fallback data from zoho_stock_summary')
      
      // Get data from existing stock view (including negative quantities for accurate calculations)
      const { data: rawData, error: fallbackError } = await supabase
        .from('zoho_stock_summary')
        .select('*')
        .not('Warehouse', 'is', null)
        .not('Name', 'is', null)
        // Removed .gt('Quantity', 0) to include negative stock movements
      
      if (fallbackError) {
        console.error('❌ Fallback stock query failed:', fallbackError)
        return []
      }
      
      if (!rawData || rawData.length === 0) {
        console.log('⚠️ No fallback stock data available')
        return []
      }
      
      // Aggregate data by warehouse
      const warehouseMap = new Map<string, {
        total_stock_value: number
        total_stock_value_with_vat: number
        product_count: number
        total_quantity: number
        unit_costs: number[]
      }>()
      
      rawData.forEach(row => {
        const warehouse = row['Warehouse'] || row['Location']
        if (!warehouse) return
        
        const stockValue = Number(row['Stock Value'] || row['Value']) || 0
        const stockValueWithVat = Number(row['Stock Value with VAT'] || row['Value with VAT'] || row['Stock Value'] || row['Value']) || 0
        const quantity = Number(row['Quantity'] || row['Stock Quantity'] || row['Qty'] || row['Available']) || 0
        const unitCost = Number(row['Unit Cost'] || row['Cost']) || 0
        
        if (!warehouseMap.has(warehouse)) {
          warehouseMap.set(warehouse, {
            total_stock_value: 0,
            total_stock_value_with_vat: 0,
            product_count: 0,
            total_quantity: 0,
            unit_costs: []
          })
        }
        
        const warehouseData = warehouseMap.get(warehouse)!
        warehouseData.total_stock_value += stockValue
        warehouseData.total_stock_value_with_vat += stockValueWithVat
        warehouseData.product_count += 1
        warehouseData.total_quantity += quantity
        if (unitCost > 0) warehouseData.unit_costs.push(unitCost)
      })
      
      // Convert to chart data format
      data = Array.from(warehouseMap.entries()).map(([warehouse, values]) => ({
        warehouse_name: warehouse,
        total_stock_value: values.total_stock_value,
        total_stock_value_with_vat: values.total_stock_value_with_vat,
        product_count: values.product_count,
        total_quantity: values.total_quantity,
        avg_unit_cost: values.unit_costs.length > 0 ? 
          values.unit_costs.reduce((sum, cost) => sum + cost, 0) / values.unit_costs.length : 0
      })).sort((a, b) => b.total_stock_value - a.total_stock_value)
      
      error = null
    }

    if (error) {
      console.error('❌ Error fetching stock by warehouse:', error)
      return []
    }

    console.log('✅ Stock by warehouse loaded:', { records: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('❌ Exception fetching stock by warehouse:', error)
    return []
  }
}

// =============================================================================
// FILTER OPTIONS FUNCTIONS (for dropdown filters)
// =============================================================================

export interface FilterOption {
  value: string
  label: string
}

/**
 * Get all unique items for dropdown filter (2025 data only)
 */
export async function getItemFilterOptions(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<FilterOption[]> {
  try {
    console.log('📋 Fetching item filter options (2025 only):', { startDate, endDate, branchFilter })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_item_filter_options_2025', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    // If 2025 function doesn't exist, try the original function
    if (error) {
      console.log('⚠️ get_item_filter_options_2025 failed, trying original function:', error?.message)
      const fallback = await supabase.rpc('get_item_filter_options', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching item filter options:', error)
      return []
    }

    if (!data) return []

    const options = data.map((item: { item_name: string }) => ({
      value: item.item_name,
      label: item.item_name
    }))

    console.log('✅ Item filter options loaded:', { count: options.length })
    return options
  } catch (error) {
    console.error('❌ Exception fetching item filter options:', error)
    return []
  }
}

/**
 * Get all unique customers for dropdown filter (2025 data only)
 */
export async function getCustomerFilterOptions(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<FilterOption[]> {
  try {
    console.log('👥 Fetching customer filter options (2025 only):', { startDate, endDate, branchFilter })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_customer_filter_options_2025', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    // If 2025 function doesn't exist, try the original function
    if (error) {
      console.log('⚠️ get_customer_filter_options_2025 failed, trying original function:', error?.message)
      const fallback = await supabase.rpc('get_customer_filter_options', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching customer filter options:', error)
      return []
    }

    if (!data) return []

    const options = data.map((customer: { customer_name: string }) => ({
      value: customer.customer_name,
      label: customer.customer_name
    }))

    console.log('✅ Customer filter options loaded:', { count: options.length })
    return options
  } catch (error) {
    console.error('❌ Exception fetching customer filter options:', error)
    return []
  }
}

/**
 * Get all unique invoice numbers for dropdown filter (2025 data only)
 */
export async function getInvoiceFilterOptions(
  startDate?: string,
  endDate?: string,
  branchFilter?: string
): Promise<FilterOption[]> {
  try {
    console.log('📄 Fetching invoice filter options (2025 only):', { startDate, endDate, branchFilter })

    // Try 2025 function first, fallback to original if it doesn't exist
    let { data, error } = await supabase.rpc('get_invoice_filter_options_2025', {
      start_date: startDate || '2025-01-01',
      end_date: endDate || formatDateLocal(new Date()),
      branch_filter: branchFilter || null
    })

    // If 2025 function doesn't exist, try the original function
    if (error) {
      console.log('⚠️ get_invoice_filter_options_2025 failed, trying original function:', error?.message)
      const fallback = await supabase.rpc('get_invoice_filter_options', {
        start_date: startDate || null,
        end_date: endDate || null,
        branch_filter: branchFilter || null
      })
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching invoice filter options:', error)
      return []
    }

    if (!data) return []

    const options = data.map((invoice: { invoice_no: string }) => ({
      value: invoice.invoice_no,
      label: invoice.invoice_no
    }))

    console.log('✅ Invoice filter options loaded:', { count: options.length })
    return options
  } catch (error) {
    console.error('❌ Exception fetching invoice filter options:', error)
    return []
  }
}

/**
 * Get all unique warehouse names for dropdown filter
 */
export async function getWarehouseFilterOptions(): Promise<FilterOption[]> {
  try {
    console.log('🏪 Fetching warehouse filter options')

    // Try RPC function first, fallback to direct query if it doesn't exist
    let { data, error } = await supabase.rpc('get_warehouse_filter_options')

    // If RPC function doesn't exist, query the table directly
    if (error) {
      console.log('⚠️ get_warehouse_filter_options failed, trying direct query:', error?.message)
      const fallback = await supabase
        .from('zoho_stock_summary')
        .select('Warehouse')
        .not('Warehouse', 'is', null)
        .not('Name', 'is', null)
        .order('Warehouse', { ascending: true })
      
      if (fallback.data) {
        // Remove duplicates and format for options
        const uniqueWarehouses = [...new Set(fallback.data.map(item => item.Warehouse))]
        data = uniqueWarehouses.map(warehouse => ({ warehouse_name: warehouse }))
      }
      error = fallback.error
    }

    if (error) {
      console.error('❌ Error fetching warehouse filter options:', error)
      return []
    }

    if (!data) return []

    const options = data.map((warehouse: { warehouse_name: string }) => ({
      value: warehouse.warehouse_name,
      label: warehouse.warehouse_name
    }))

    console.log('✅ Warehouse filter options loaded:', { count: options.length })
    return options
  } catch (error) {
    console.error('❌ Exception fetching warehouse filter options:', error)
    return []
  }
}

// =============================================================================
// INVOICE ITEMS API
// =============================================================================

export interface InvoiceItem {
  item_name: string
  quantity: number
  unit_price: number
  sale_price: number
  unit_cost: number
  cost: number
  unit_profit: number
  profit: number
  profit_percentage: number
}

/**
 * Get detailed items for a specific invoice with profit calculations
 */
export async function getInvoiceItems(invoiceNumber: string): Promise<InvoiceItem[] | null> {
  try {
    console.log('📋 Fetching invoice items for invoice:', invoiceNumber)

    const { data, error } = await supabase.rpc('get_invoice_items_with_profit', {
      invoice_number: invoiceNumber
    })

    if (error) {
      console.error('❌ Error fetching invoice items:', error)
      return null
    }

    if (!data) {
      console.log('⚠️ No items found for invoice:', invoiceNumber)
      return []
    }

    console.log('✅ Invoice items loaded:', { 
      invoice: invoiceNumber, 
      itemCount: data.length,
      totalProfit: data.reduce((sum: number, item: Record<string, unknown>) => sum + ((item.profit as number) || 0), 0)
    })
    
    return data
  } catch (error) {
    console.error('❌ Exception fetching invoice items:', error)
    return null
  }
}

// =============================================================================
// CSV EXPORT FUNCTIONS - Database Direct Export
// =============================================================================

/**
 * Export all invoices for CSV with filters - no pagination limit
 */
export async function exportInvoicesForCSV(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  customerFilter?: string,
  invoiceFilter?: string
): Promise<OptimizedInvoice[] | null> {
  try {
    console.log('📤 Exporting invoices for CSV:', { startDate, endDate, branchFilter, customerFilter, invoiceFilter })
    
    // Use existing function with high page limit to get all records
    const result = await getOptimizedProfitByInvoice(
      startDate,
      endDate,
      branchFilter,
      customerFilter,
      invoiceFilter,
      50000, // High page limit to get all records
      0      // Start from beginning
    )
    
    if (!result) {
      console.error('❌ Failed to fetch invoices for export')
      return null
    }
    
    console.log('✅ Invoices exported for CSV:', { count: result.data.length })
    return result.data
  } catch (error) {
    console.error('❌ Error exporting invoices for CSV:', error)
    return null
  }
}

/**
 * Export invoices with their items for CSV
 */
export async function exportInvoicesWithItemsForCSV(
  startDate?: string,
  endDate?: string,
  branchFilter?: string,
  customerFilter?: string,
  invoiceFilter?: string
): Promise<{ invoices: OptimizedInvoice[], itemsMap: Map<string, InvoiceItem[]> } | null> {
  try {
    console.log('📤 Exporting invoices with items for CSV:', { startDate, endDate, branchFilter, customerFilter, invoiceFilter })
    
    // First get all invoices
    const invoices = await exportInvoicesForCSV(startDate, endDate, branchFilter, customerFilter, invoiceFilter)
    if (!invoices) {
      return null
    }
    
    // Then batch fetch items for all invoices
    const itemsMap = new Map<string, InvoiceItem[]>()
    const batchSize = 10 // Process 10 invoices at a time to avoid overwhelming the API
    
    for (let i = 0; i < invoices.length; i += batchSize) {
      const batch = invoices.slice(i, i + batchSize)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (invoice) => {
        const items = await getInvoiceItems(invoice.invoice_no)
        if (items && items.length > 0) {
          itemsMap.set(invoice.invoice_no, items)
        }
      })
      
      await Promise.all(batchPromises)
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < invoices.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log('✅ Invoices with items exported for CSV:', { 
      invoiceCount: invoices.length, 
      itemsCount: itemsMap.size 
    })
    
    return { invoices, itemsMap }
  } catch (error) {
    console.error('❌ Error exporting invoices with items for CSV:', error)
    return null
  }
}