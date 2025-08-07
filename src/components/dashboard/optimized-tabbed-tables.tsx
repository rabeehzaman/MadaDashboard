"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, Users, FileText, Warehouse, ChevronDown } from "lucide-react"
import { 
  useOptimizedProfitByItem, 
  useOptimizedProfitByCustomer, 
  useOptimizedProfitByInvoice, 
  useOptimizedStockReport,
  useItemFilterOptions,
  useCustomerFilterOptions,
  useInvoiceFilterOptions,
  useWarehouseFilterOptions
} from "@/hooks/use-optimized-data"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { formatCurrencyTable, formatNumber, formatDateSA } from "@/lib/formatting"
import type { DateRange } from "./date-filter"

interface OptimizedTabbedTablesProps {
  dateRange?: DateRange
  branchFilter?: string
}

export function OptimizedTabbedTables({ dateRange, branchFilter }: OptimizedTabbedTablesProps) {
  // Dual state management for immediate UI vs deferred content rendering
  const [activeTab, setActiveTab] = React.useState("items")        // Immediate visual feedback
  const [contentTab, setContentTab] = React.useState("items")      // Deferred content rendering
  const [switchingTab, setSwitchingTab] = React.useState(false)    // Transition state
  
  // Filter states for all tables (no search filters)
  const [itemFilter, setItemFilter] = React.useState<string | undefined>(undefined)
  const [itemCustomerFilter, setItemCustomerFilter] = React.useState<string | undefined>(undefined)
  const [itemInvoiceFilter, setItemInvoiceFilter] = React.useState<string | undefined>(undefined)
  
  // Profit by invoice filters
  const [invoiceCustomerFilter, setInvoiceCustomerFilter] = React.useState<string | undefined>(undefined)
  const [invoiceNumberFilter, setInvoiceNumberFilter] = React.useState<string | undefined>(undefined)
  
  // Profit by customer filter
  const [customerOnlyFilter, setCustomerOnlyFilter] = React.useState<string | undefined>(undefined)
  
  // Stock report filter
  const [warehouseFilter, setWarehouseFilter] = React.useState<string | undefined>(undefined)

  // Pagination is now handled server-side
  const itemsPerPage = 25

  // Async tab switching handler for immediate UI response
  const handleTabChange = React.useCallback((newTab: string) => {
    // Immediate visual feedback - tab becomes active instantly
    setActiveTab(newTab)
    setSwitchingTab(true)
    
    // Defer content rendering to next frame to allow UI to update first
    setTimeout(() => {
      setContentTab(newTab)
      setSwitchingTab(false)
    }, 0)
  }, [])

  // Data hooks - Load all 2025 data initially, filter client-side
  const {
    data: itemData,
    loading: itemLoading,
    loadingMore: itemLoadingMore,
    showingAll: itemShowingAll,
    hasMore: itemHasMore,
    loadAllData: loadAllItemData
  } = useOptimizedProfitByItem(
    dateRange, 
    branchFilter, 
    10000, // Load all 2025 data
    itemFilter,
    itemCustomerFilter,
    itemInvoiceFilter
  )

  const {
    data: customerData,
    loading: customerLoading
  } = useOptimizedProfitByCustomer(dateRange, branchFilter, customerOnlyFilter)

  const {
    data: invoiceData,
    loading: invoiceLoading,
    loadingMore: invoiceLoadingMore,
    showingAll: invoiceShowingAll,
    hasMore: invoiceHasMore,
    loadAllData: loadAllInvoiceData
  } = useOptimizedProfitByInvoice(dateRange, branchFilter, 10000, invoiceCustomerFilter, invoiceNumberFilter)

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 Debug data status:', {
      itemData: itemData?.length || 0,
      itemLoading,
      invoiceData: invoiceData?.length || 0,
      invoiceLoading,
      customerData: customerData?.length || 0,
      customerLoading
    })
    if (itemData?.length > 0) {
      console.log('📊 Sample item data:', itemData[0])
    }
    if (invoiceData?.length > 0) {
      console.log('📋 Sample invoice data:', invoiceData[0])
    }
  }, [itemData, invoiceData, customerData, itemLoading, invoiceLoading, customerLoading])

  const {
    data: stockData,
    loading: stockLoading
  } = useOptimizedStockReport(warehouseFilter)

  // Get filter options for dropdown filters
  const {
    options: itemFilterOptions,
    loading: itemFilterOptionsLoading
  } = useItemFilterOptions(dateRange, branchFilter)

  const {
    options: customerFilterOptions,
    loading: customerFilterOptionsLoading
  } = useCustomerFilterOptions(dateRange, branchFilter)

  const {
    options: invoiceFilterOptions,
    loading: invoiceFilterOptionsLoading
  } = useInvoiceFilterOptions(dateRange, branchFilter)

  const {
    options: warehouseFilterOptions,
    loading: warehouseFilterOptionsLoading
  } = useWarehouseFilterOptions()

  // Data is already filtered by database, no client-side filtering needed
  // However, we implement a simple pagination display for better UX
  const [showAllItems, setShowAllItems] = React.useState(false)
  const [showAllInvoices, setShowAllInvoices] = React.useState(false)

  const displayItemData = showAllItems ? itemData : itemData.slice(0, itemsPerPage)
  const displayInvoiceData = showAllInvoices ? invoiceData : invoiceData.slice(0, itemsPerPage)
  const displayCustomerData = customerData
  const displayStockData = stockData

  // Calculate totals from COMPLETE dataset (already filtered by database)
  const customerTotal = displayCustomerData.reduce((sum, item) => sum + (item.total_profit || 0), 0)
  
  const invoiceTotal = {
    salePrice: displayInvoiceData.reduce((sum, item) => sum + (item.total_sale_price || 0), 0),
    cost: displayInvoiceData.reduce((sum, item) => sum + (item.total_cost || 0), 0),
    profit: displayInvoiceData.reduce((sum, item) => sum + (item.total_profit || 0), 0)
  }

  const stockTotal = {
    stock: displayStockData.reduce((sum, item) => sum + (item.stock_quantity || 0), 0),
    stockInPcs: displayStockData.reduce((sum, item) => sum + (item.stock_in_pieces || 0), 0),
    totalCost: displayStockData.reduce((sum, item) => sum + (item.current_stock_value || 0), 0),
    totalCostWithVAT: displayStockData.reduce((sum, item) => sum + (item.stock_value_with_vat || 0), 0)
  }

  // Stock data filtering (still client-side as it's a single load)

  // Create loading component for individual tabs
  const TabLoadingState = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center h-32">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>{message}</span>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimized Analysis Tables</CardTitle>
        <CardDescription>
          Database-optimized views with perfect KPI consistency
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Using optimized RPC functions and database views</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 grid-rows-2 sm:grid-cols-4 sm:grid-rows-1 gap-1 min-h-[44px] h-auto">
            <TabsTrigger value="items" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Profit by Item</span>
              <span className="sm:hidden">Items</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Profit by Customer</span>
              <span className="sm:hidden">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Profit by Invoice</span>
              <span className="sm:hidden">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="flex items-center gap-1 text-xs sm:text-sm min-h-[44px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Warehouse className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Stock Report</span>
              <span className="sm:hidden">Stock</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {contentTab !== "items" ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Switching to Items...</span>
                </div>
              </div>
            ) : itemLoading ? (
              <TabLoadingState message="Loading items data from optimized database views..." />
            ) : (
              <>
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {displayItemData.length} {showAllItems ? 'of all' : `of first ${itemsPerPage}`} items
                      <span className="text-green-600 ml-2">• 2025 data only for optimal performance</span>
                    </div>
                  </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-muted/50 p-3 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filters:</span>
                <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 overflow-hidden">
                  <SearchableSelect
                    options={itemFilterOptions}
                    value={itemFilter}
                    onValueChange={setItemFilter}
                    placeholder="Filter by item..."
                    searchPlaceholder="Search items..."
                    className="w-full sm:w-[200px] sm:max-w-[200px] min-w-0 min-h-[44px]"
                    loading={itemFilterOptionsLoading}
                  />
                  <SearchableSelect
                    options={customerFilterOptions}
                    value={itemCustomerFilter}
                    onValueChange={setItemCustomerFilter}
                    placeholder="Filter by customer..."
                    searchPlaceholder="Search customers..."
                    className="w-full sm:w-[200px] sm:max-w-[200px] min-w-0 min-h-[44px]"
                    loading={customerFilterOptionsLoading}
                  />
                  <SearchableSelect
                    options={invoiceFilterOptions}
                    value={itemInvoiceFilter}
                    onValueChange={setItemInvoiceFilter}
                    placeholder="Filter by invoice..."
                    searchPlaceholder="Search invoices..."
                    className="w-full sm:w-[180px] sm:max-w-[180px] min-w-0 min-h-[44px]"
                    loading={invoiceFilterOptionsLoading}
                  />
                </div>
                {(itemFilter || itemCustomerFilter || itemInvoiceFilter) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setItemFilter(undefined)
                      setItemCustomerFilter(undefined)
                      setItemInvoiceFilter(undefined)
                    }}
                    className="whitespace-nowrap min-h-[44px]"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
            <div className="rounded-md border overflow-hidden">
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="space-y-3 p-3">
                  {displayItemData.map((item, index) => (
                    <div key={`${item.inv_no}-${index}`} className="bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium truncate flex-1 mr-2">{item.item}</div>
                        <Badge variant={(item.profit_percent || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                          {(item.profit_percent || 0).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>Date: {formatDateSA(item.inv_date)}</div>
                        <div>Invoice: {item.inv_no}</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Price:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(item.unit_price || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(item.unit_cost || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Profit:</span><br/>
                          <Badge variant={(item.unit_profit || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                            {formatCurrencyTable(item.unit_profit || 0)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">U.Price</TableHead>
                      <TableHead className="text-right">U.Cost</TableHead>
                      <TableHead className="text-right">Unit Profit</TableHead>
                      <TableHead className="text-right">Profit %</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {displayItemData.map((item, index) => (
                    <TableRow key={`${item.inv_no}-${index}`}>
                      <TableCell>{formatDateSA(item.inv_date)}</TableCell>
                      <TableCell>{item.inv_no}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.item}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(item.unit_price || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(item.unit_cost || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(item.unit_profit || 0) >= 0 ? "default" : "destructive"}>
                          {formatCurrencyTable(item.unit_profit || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(item.profit_percent || 0) >= 0 ? "default" : "destructive"}>
                          {(item.profit_percent || 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
            {!showAllItems && itemData.length > itemsPerPage && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => setShowAllItems(true)}
                  variant="outline"
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show All ({itemData.length} items)
                </Button>
              </div>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            {contentTab !== "customers" ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Switching to Customers...</span>
                </div>
              </div>
            ) : customerLoading ? (
              <TabLoadingState message="Loading customers data from optimized database views..." />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {displayCustomerData.length} customers
                    <span className="text-green-600 ml-2">• 2025 data only for optimal performance</span>
                  </div>
                </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter:</span>
              <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 overflow-hidden">
                <SearchableSelect
                  options={customerFilterOptions}
                  value={customerOnlyFilter}
                  onValueChange={setCustomerOnlyFilter}
                  placeholder="Filter by customer..."
                  searchPlaceholder="Search customers..."
                  className="w-full sm:w-[300px] sm:max-w-[300px] min-w-0 min-h-[44px]"
                  loading={customerFilterOptionsLoading}
                />
              </div>
              {customerOnlyFilter && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCustomerOnlyFilter(undefined)}
                  className="whitespace-nowrap"
                >
                  Clear Filter
                </Button>
              )}
            </div>
            <div className="rounded-md border overflow-hidden">
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="p-3 bg-muted/50 border-b">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <Badge variant={customerTotal >= 0 ? "default" : "destructive"} className="text-sm">
                      {formatCurrencyTable(customerTotal)}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {displayCustomerData.map((customer, index) => (
                    <div key={`${customer.customer_name}-${index}`} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                      <div className="text-sm font-medium truncate flex-1 mr-2">{customer.customer_name}</div>
                      <Badge variant={(customer.total_profit || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                        {formatCurrencyTable(customer.total_profit || 0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="bg-muted font-semibold">Total:</TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(customerTotal)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCustomerData.map((customer, index) => (
                    <TableRow key={`${customer.customer_name}-${index}`}>
                      <TableCell>{customer.customer_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(customer.total_profit || 0) >= 0 ? "default" : "destructive"}>
                          {formatCurrencyTable(customer.total_profit || 0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            {contentTab !== "invoices" ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Switching to Invoices...</span>
                </div>
              </div>
            ) : invoiceLoading ? (
              <TabLoadingState message="Loading invoices data from optimized database views..." />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {displayInvoiceData.length} {showAllInvoices ? 'of all' : `of first ${itemsPerPage}`} invoices
                    <span className="text-green-600 ml-2">• 2025 data only for optimal performance</span>
                  </div>
                </div>
            
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filters:</span>
              <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 overflow-hidden">
                <SearchableSelect
                  options={customerFilterOptions}
                  value={invoiceCustomerFilter}
                  onValueChange={setInvoiceCustomerFilter}
                  placeholder="Filter by customer..."
                  searchPlaceholder="Search customers..."
                  className="w-full sm:w-[250px] sm:max-w-[250px] min-w-0 min-h-[44px]"
                  loading={customerFilterOptionsLoading}
                />
                <SearchableSelect
                  options={invoiceFilterOptions}
                  value={invoiceNumberFilter}
                  onValueChange={setInvoiceNumberFilter}
                  placeholder="Filter by invoice..."
                  searchPlaceholder="Search invoices..."
                  className="w-full sm:w-[200px] sm:max-w-[200px] min-w-0 min-h-[44px]"
                  loading={invoiceFilterOptionsLoading}
                />
              </div>
              {(invoiceCustomerFilter || invoiceNumberFilter) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setInvoiceCustomerFilter(undefined)
                    setInvoiceNumberFilter(undefined)
                  }}
                  className="whitespace-nowrap"
                >
                  Clear All
                </Button>
              )}
            </div>
            <div className="rounded-md border overflow-hidden">
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="p-3 bg-muted/50 border-b space-y-2">
                  <div className="font-semibold text-sm">Totals:</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Sale Price:</div>
                      <div className="font-medium">{formatCurrencyTable(invoiceTotal.salePrice)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cost:</div>
                      <div className="font-medium">{formatCurrencyTable(invoiceTotal.cost)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Profit:</div>
                      <Badge variant={invoiceTotal.profit >= 0 ? "default" : "destructive"} className="text-xs">
                        {formatCurrencyTable(invoiceTotal.profit)}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Profit %:</div>
                      <Badge variant={invoiceTotal.profit >= 0 ? "default" : "destructive"} className="text-xs">
                        {invoiceTotal.salePrice > 0 ? ((invoiceTotal.profit / invoiceTotal.salePrice) * 100).toFixed(1) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  {displayInvoiceData.map((invoice, index) => (
                    <div key={`${invoice.invoice_no}-${index}`} className="bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-sm font-medium">{invoice.invoice_no}</div>
                        <Badge variant={(invoice.profit_margin_percent || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                          {(invoice.profit_margin_percent || 0).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Date: {formatDateSA(invoice.inv_date)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Sale:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(invoice.total_sale_price || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cost:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(invoice.total_cost || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Profit:</span><br/>
                          <Badge variant={(invoice.total_profit || 0) >= 0 ? "default" : "destructive"} className="text-xs">
                            {formatCurrencyTable(invoice.total_profit || 0)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Profit %</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead colSpan={2} className="bg-muted font-semibold">Total:</TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(invoiceTotal.salePrice)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(invoiceTotal.cost)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(invoiceTotal.profit)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {invoiceTotal.salePrice > 0 ? ((invoiceTotal.profit / invoiceTotal.salePrice) * 100).toFixed(1) : 0}%
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInvoiceData.map((invoice, index) => (
                    <TableRow key={`${invoice.invoice_no}-${index}`}>
                      <TableCell>{formatDateSA(invoice.inv_date)}</TableCell>
                      <TableCell>{invoice.invoice_no}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(invoice.total_sale_price || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(invoice.total_cost || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(invoice.total_profit || 0) >= 0 ? "default" : "destructive"}>
                          {formatCurrencyTable(invoice.total_profit || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={(invoice.profit_margin_percent || 0) >= 0 ? "default" : "destructive"}>
                          {(invoice.profit_margin_percent || 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
            {!showAllInvoices && invoiceData.length > itemsPerPage && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => setShowAllInvoices(true)}
                  variant="outline"
                  className="flex items-center gap-2 min-h-[44px]"
                >
                  <ChevronDown className="h-4 w-4" />
                  Show All ({invoiceData.length} invoices)
                </Button>
              </div>
            )}
              </>
            )}
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            {contentTab !== "stock" ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Switching to Stock...</span>
                </div>
              </div>
            ) : stockLoading ? (
              <TabLoadingState message="Loading stock data from optimized database views..." />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {displayStockData.length} products
                    <span className="text-green-600 ml-2">• Total reflects filtered data</span>
                    <span className="text-blue-600 ml-2">• KPI shows all warehouses</span>
                  </div>
                </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter:</span>
              <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0 overflow-hidden">
                <SearchableSelect
                  options={warehouseFilterOptions}
                  value={warehouseFilter}
                  onValueChange={setWarehouseFilter}
                  placeholder="Filter by warehouse..."
                  searchPlaceholder="Search warehouses..."
                  className="w-full sm:w-[250px] sm:max-w-[250px] min-w-0 min-h-[44px]"
                  loading={warehouseFilterOptionsLoading}
                />
              </div>
              {warehouseFilter && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setWarehouseFilter(undefined)}
                  className="whitespace-nowrap"
                >
                  Clear Filter
                </Button>
              )}
            </div>
            <div className="rounded-md border overflow-hidden">
              {/* Mobile View */}
              <div className="md:hidden">
                <div className="p-3 bg-muted/50 border-b space-y-2">
                  <div className="font-semibold text-sm">Totals:</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Stock Qty:</div>
                      <div className="font-medium">{formatNumber(stockTotal.stock)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Stock (Pcs):</div>
                      <div className="font-medium">{formatNumber(stockTotal.stockInPcs)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Cost:</div>
                      <div className="font-medium">{formatCurrencyTable(stockTotal.totalCost)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cost with VAT:</div>
                      <div className="font-medium">{formatCurrencyTable(stockTotal.totalCostWithVAT)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-3">
                  {displayStockData.map((stock, index) => (
                    <div key={`${stock.product_name}-${index}`} className="bg-muted/30 p-3 rounded-lg space-y-2">
                      <div className="text-sm font-medium truncate">{stock.product_name}</div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Qty:</span><br/>
                          <span className="font-medium">{formatNumber(stock.stock_quantity || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pieces:</span><br/>
                          <span className="font-medium">{formatNumber(stock.stock_in_pieces || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unit Cost:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(stock.unit_cost || 0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Cost:</span><br/>
                          <span className="font-medium">{formatCurrencyTable(stock.current_stock_value || 0)}</span>
                        </div>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">With VAT:</span>
                        <span className="font-medium ml-1">{formatCurrencyTable(stock.stock_value_with_vat || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Stock in Pcs</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Total Cost with VAT</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="bg-muted font-semibold">Total:</TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatNumber(stockTotal.stock)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatNumber(stockTotal.stockInPcs)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">-</TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(stockTotal.totalCost)}
                    </TableHead>
                    <TableHead className="bg-muted font-semibold text-right">
                      {formatCurrencyTable(stockTotal.totalCostWithVAT)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayStockData.map((stock, index) => (
                    <TableRow key={`${stock.product_name}-${index}`}>
                      <TableCell className="max-w-[300px] truncate">{stock.product_name}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.stock_quantity || 0)}</TableCell>
                      <TableCell className="text-right">{formatNumber(stock.stock_in_pieces || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(stock.unit_cost || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(stock.current_stock_value || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrencyTable(stock.stock_value_with_vat || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}