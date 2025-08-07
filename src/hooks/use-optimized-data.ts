"use client"

import { useState, useEffect } from 'react'
import {
  getOptimizedKPIs,
  getOptimizedProfitByItem,
  getOptimizedProfitByCustomer,
  getOptimizedProfitByInvoice,
  getOptimizedStockReport,
  getProfitByItemTotals,
  getProfitByInvoiceTotals,
  getItemFilterOptions,
  getCustomerFilterOptions,
  getInvoiceFilterOptions,
  getWarehouseFilterOptions,
  formatDateForRPC,
  type OptimizedKPIs,
  type OptimizedTransaction,
  type OptimizedCustomer,
  type OptimizedInvoice,
  type OptimizedStock,
  type PaginationInfo,
  type ProfitByItemTotals,
  type ProfitByInvoiceTotals,
  type FilterOption
} from '@/lib/database-optimized'
import type { DateRange } from '@/components/dashboard/date-filter'

// =============================================================================
// OPTIMIZED KPI HOOK
// =============================================================================

export function useOptimizedKPIs(dateRange?: DateRange, branchFilter?: string) {
  const [kpis, setKpis] = useState<OptimizedKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadKPIs() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log('🚀 Loading optimized KPIs:', { startDate, endDate, branchFilter })

        const result = await getOptimizedKPIs(startDate, endDate, branchFilter)

        if (result) {
          setKpis(result)
          console.log('✅ KPIs loaded successfully')
        } else {
          setError('Failed to load KPIs')
          console.error('❌ KPIs loading failed')
        }
      } catch (err) {
        console.error('❌ Error loading KPIs:', err)
        setError('Failed to load KPIs')
        setKpis(null)
      } finally {
        setLoading(false)
      }
    }

    loadKPIs()
  }, [dateRange, branchFilter])

  return { kpis, loading, error }
}

// =============================================================================
// OPTIMIZED PROFIT BY ITEM HOOK
// =============================================================================

export function useOptimizedProfitByItem(
  dateRange?: DateRange,
  branchFilter?: string,
  pageSize: number = 10000,
  itemFilter?: string,
  customerFilter?: string,
  invoiceFilter?: string
) {
  const [data, setData] = useState<OptimizedTransaction[]>([])
  const [allData, setAllData] = useState<OptimizedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showingAll, setShowingAll] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    pageSize: pageSize,
    currentOffset: 0,
    hasMore: false,
    totalPages: 0
  })

  const loadPage = async (offset: number = 0) => {
    try {
      setLoading(true)
      setError(null)

      const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
      const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

      console.log('📊 Loading profit by item page:', { offset, pageSize, startDate, endDate, branchFilter, itemFilter, customerFilter, invoiceFilter })

      const result = await getOptimizedProfitByItem(startDate, endDate, branchFilter, itemFilter, customerFilter, invoiceFilter, pageSize, offset)

      if (result) {
        setData(result.data)
        setPagination(result.pagination)
        console.log('✅ Profit by item loaded:', { records: result.data.length, total: result.pagination.totalCount })
      } else {
        setError('Failed to load profit by item data')
        setData([])
        setPagination({
          totalCount: 0,
          pageSize,
          currentOffset: offset,
          hasMore: false,
          totalPages: 0
        })
      }
    } catch (err) {
      console.error('❌ Error loading profit by item:', err)
      setError('Failed to load profit by item data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    try {
      setLoadingMore(true)
      setError(null)

      const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
      const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

      console.log('📊 Loading ALL profit by item data:', { startDate, endDate, branchFilter, itemFilter, customerFilter, invoiceFilter })

      // Load all data by requesting a very large page size
      const result = await getOptimizedProfitByItem(startDate, endDate, branchFilter, itemFilter, customerFilter, invoiceFilter, 10000, 0)

      if (result) {
        setAllData(result.data)
        setShowingAll(true)
        console.log('✅ All profit by item data loaded:', { records: result.data.length })
      } else {
        setError('Failed to load all profit by item data')
      }
    } catch (err) {
      console.error('❌ Error loading all profit by item data:', err)
      setError('Failed to load all profit by item data')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    // Reset states when filters change
    setShowingAll(false)
    setAllData([])
    loadPage(0) // Load first page when dependencies change
  }, [dateRange, branchFilter, pageSize, itemFilter, customerFilter, invoiceFilter])

  const nextPage = () => {
    if (pagination.hasMore) {
      const nextOffset = pagination.currentOffset + pageSize
      loadPage(nextOffset)
    }
  }

  const prevPage = () => {
    if (pagination.currentOffset > 0) {
      const prevOffset = Math.max(0, pagination.currentOffset - pageSize)
      loadPage(prevOffset)
    }
  }

  const goToPage = (page: number) => {
    const offset = page * pageSize
    if (offset >= 0 && offset < pagination.totalCount) {
      loadPage(offset)
    }
  }

  return {
    data: showingAll ? allData : data,
    loading,
    loadingMore,
    error,
    pagination,
    showingAll,
    hasMore: !showingAll && pagination.totalCount > pageSize,
    nextPage,
    prevPage,
    goToPage,
    loadAllData,
    refresh: () => loadPage(pagination.currentOffset)
  }
}

// =============================================================================
// OPTIMIZED PROFIT BY CUSTOMER HOOK
// =============================================================================

export function useOptimizedProfitByCustomer(dateRange?: DateRange, branchFilter?: string, customerFilter?: string) {
  const [data, setData] = useState<OptimizedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log('👥 Loading profit by customer:', { startDate, endDate, branchFilter, customerFilter })

        const result = await getOptimizedProfitByCustomer(startDate, endDate, branchFilter, customerFilter)

        if (result) {
          setData(result)
          console.log('✅ Profit by customer loaded:', { customers: result.length })
        } else {
          setError('Failed to load profit by customer data')
          setData([])
        }
      } catch (err) {
        console.error('❌ Error loading profit by customer:', err)
        setError('Failed to load profit by customer data')
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [dateRange, branchFilter, customerFilter])

  return { data, loading, error }
}

// =============================================================================
// OPTIMIZED PROFIT BY INVOICE HOOK
// =============================================================================

export function useOptimizedProfitByInvoice(
  dateRange?: DateRange,
  branchFilter?: string,
  pageSize: number = 10000,
  customerFilter?: string,
  invoiceFilter?: string
) {
  const [data, setData] = useState<OptimizedInvoice[]>([])
  const [allData, setAllData] = useState<OptimizedInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showingAll, setShowingAll] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    pageSize: pageSize,
    currentOffset: 0,
    hasMore: false,
    totalPages: 0
  })

  const loadPage = async (offset: number = 0) => {
    try {
      setLoading(true)
      setError(null)

      const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
      const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

      console.log('📋 Loading profit by invoice page:', { offset, pageSize, startDate, endDate, branchFilter, customerFilter, invoiceFilter })

      const result = await getOptimizedProfitByInvoice(startDate, endDate, branchFilter, customerFilter, invoiceFilter, pageSize, offset)

      if (result) {
        setData(result.data)
        setPagination(result.pagination)
        console.log('✅ Profit by invoice loaded:', { records: result.data.length, total: result.pagination.totalCount })
      } else {
        setError('Failed to load profit by invoice data')
        setData([])
        setPagination({
          totalCount: 0,
          pageSize,
          currentOffset: offset,
          hasMore: false,
          totalPages: 0
        })
      }
    } catch (err) {
      console.error('❌ Error loading profit by invoice:', err)
      setError('Failed to load profit by invoice data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    try {
      setLoadingMore(true)
      setError(null)

      const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
      const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

      console.log('📋 Loading ALL profit by invoice data:', { startDate, endDate, branchFilter, customerFilter, invoiceFilter })

      // Load all data by requesting a very large page size
      const result = await getOptimizedProfitByInvoice(startDate, endDate, branchFilter, customerFilter, invoiceFilter, 10000, 0)

      if (result) {
        setAllData(result.data)
        setShowingAll(true)
        console.log('✅ All profit by invoice data loaded:', { records: result.data.length })
      } else {
        setError('Failed to load all profit by invoice data')
      }
    } catch (err) {
      console.error('❌ Error loading all profit by invoice data:', err)
      setError('Failed to load all profit by invoice data')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    // Reset states when filters change
    setShowingAll(false)
    setAllData([])
    loadPage(0) // Load first page when dependencies change
  }, [dateRange, branchFilter, pageSize, customerFilter, invoiceFilter])

  const nextPage = () => {
    if (pagination.hasMore) {
      const nextOffset = pagination.currentOffset + pageSize
      loadPage(nextOffset)
    }
  }

  const prevPage = () => {
    if (pagination.currentOffset > 0) {
      const prevOffset = Math.max(0, pagination.currentOffset - pageSize)
      loadPage(prevOffset)
    }
  }

  const goToPage = (page: number) => {
    const offset = page * pageSize
    if (offset >= 0 && offset < pagination.totalCount) {
      loadPage(offset)
    }
  }

  return {
    data: showingAll ? allData : data,
    loading,
    loadingMore,
    error,
    pagination,
    showingAll,
    hasMore: !showingAll && pagination.totalCount > pageSize,
    nextPage,
    prevPage,
    goToPage,
    loadAllData,
    refresh: () => loadPage(pagination.currentOffset)
  }
}

// =============================================================================
// OPTIMIZED STOCK REPORT HOOK
// =============================================================================

export function useOptimizedStockReport(warehouseFilter?: string) {
  const [data, setData] = useState<OptimizedStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStockReport() {
      try {
        setLoading(true)
        setError(null)

        console.log('📦 Loading stock report with warehouse filter:', { warehouseFilter })

        const result = await getOptimizedStockReport(warehouseFilter)

        if (result) {
          setData(result)
          console.log('✅ Stock report loaded:', { items: result.length })
        } else {
          setError('Failed to load stock report')
          setData([])
        }
      } catch (err) {
        console.error('❌ Error loading stock report:', err)
        setError('Failed to load stock report')
        setData([])
      } finally {
        setLoading(false)
      }
    }

    loadStockReport()
  }, [warehouseFilter])

  return { data, loading, error }
}

// =============================================================================
// TOTALS HOOKS (for accurate totals display)
// =============================================================================

export function useProfitByItemTotals(dateRange?: DateRange, branchFilter?: string, searchQuery?: string) {
  const [totals, setTotals] = useState<ProfitByItemTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTotals() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log('📊 Loading profit by item totals:', { startDate, endDate, branchFilter, searchQuery })

        const result = await getProfitByItemTotals(startDate, endDate, branchFilter, searchQuery)

        if (result) {
          setTotals(result)
          console.log('✅ Profit by item totals loaded')
        } else {
          setError('Failed to load profit by item totals')
          setTotals(null)
        }
      } catch (err) {
        console.error('❌ Error loading profit by item totals:', err)
        setError('Failed to load profit by item totals')
        setTotals(null)
      } finally {
        setLoading(false)
      }
    }

    loadTotals()
  }, [dateRange, branchFilter, searchQuery])

  return { totals, loading, error }
}

export function useProfitByInvoiceTotals(dateRange?: DateRange, branchFilter?: string, searchQuery?: string) {
  const [totals, setTotals] = useState<ProfitByInvoiceTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTotals() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log('📋 Loading profit by invoice totals:', { startDate, endDate, branchFilter, searchQuery })

        const result = await getProfitByInvoiceTotals(startDate, endDate, branchFilter, searchQuery)

        if (result) {
          setTotals(result)
          console.log('✅ Profit by invoice totals loaded')
        } else {
          setError('Failed to load profit by invoice totals')
          setTotals(null)
        }
      } catch (err) {
        console.error('❌ Error loading profit by invoice totals:', err)
        setError('Failed to load profit by invoice totals')
        setTotals(null)
      } finally {
        setLoading(false)
      }
    }

    loadTotals()
  }, [dateRange, branchFilter, searchQuery])

  return { totals, loading, error }
}
// =============================================================================
// FILTER OPTIONS HOOKS (for dropdown filters)
// =============================================================================

export function useItemFilterOptions(dateRange?: DateRange, branchFilter?: string) {
  const [options, setOptions] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log("📋 Loading item filter options:", { startDate, endDate, branchFilter })

        const result = await getItemFilterOptions(startDate, endDate, branchFilter)
        setOptions(result)
        console.log("✅ Item filter options loaded:", { count: result.length })
      } catch (err) {
        console.error("❌ Error loading item filter options:", err)
        setError("Failed to load item filter options")
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [dateRange, branchFilter])

  return { options, loading, error }
}

export function useCustomerFilterOptions(dateRange?: DateRange, branchFilter?: string) {
  const [options, setOptions] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log("👥 Loading customer filter options:", { startDate, endDate, branchFilter })

        const result = await getCustomerFilterOptions(startDate, endDate, branchFilter)
        setOptions(result)
        console.log("✅ Customer filter options loaded:", { count: result.length })
      } catch (err) {
        console.error("❌ Error loading customer filter options:", err)
        setError("Failed to load customer filter options")
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [dateRange, branchFilter])

  return { options, loading, error }
}

export function useInvoiceFilterOptions(dateRange?: DateRange, branchFilter?: string) {
  const [options, setOptions] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true)
        setError(null)

        const startDate = dateRange?.from ? formatDateForRPC(dateRange.from) : undefined
        const endDate = dateRange?.to ? formatDateForRPC(dateRange.to) : undefined

        console.log("📄 Loading invoice filter options:", { startDate, endDate, branchFilter })

        const result = await getInvoiceFilterOptions(startDate, endDate, branchFilter)
        setOptions(result)
        console.log("✅ Invoice filter options loaded:", { count: result.length })
      } catch (err) {
        console.error("❌ Error loading invoice filter options:", err)
        setError("Failed to load invoice filter options")
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [dateRange, branchFilter])

  return { options, loading, error }
}

export function useWarehouseFilterOptions() {
  const [options, setOptions] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOptions() {
      try {
        setLoading(true)
        setError(null)

        console.log("🏪 Loading warehouse filter options")

        const result = await getWarehouseFilterOptions()
        setOptions(result)
        console.log("✅ Warehouse filter options loaded:", { count: result.length })
      } catch (err) {
        console.error("❌ Error loading warehouse filter options:", err)
        setError("Failed to load warehouse filter options")
        setOptions([])
      } finally {
        setLoading(false)
      }
    }

    loadOptions()
  }, [])

  return { options, loading, error }
}
