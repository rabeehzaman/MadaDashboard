"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, DollarSign, Calculator, Receipt, Target } from "lucide-react"
import { useOptimizedProfitByInvoice } from "@/hooks/use-optimized-data"
import { useExpenses } from "@/hooks/use-expenses"
import { formatCurrencyTable } from "@/lib/formatting"
import type { DateRange } from "@/components/dashboard/date-filter"

interface StatementOfProfitAndLossProps {
  dateRange?: DateRange
  branchFilter?: string
}

interface ProfitAndLossData {
  totalSales: number
  costOfGoodsSold: number
  grossProfit: number
  grossProfitMargin: number
  totalExpenses: number
  netProfit: number
  netProfitMargin: number
}

export function StatementOfProfitAndLoss({ dateRange, branchFilter }: StatementOfProfitAndLossProps) {
  // Load all invoice data to calculate totals
  const {
    data: invoiceData,
    loading: invoiceLoading,
    error: invoiceError
  } = useOptimizedProfitByInvoice(dateRange, branchFilter, 10000) // Load all data

  // Load expenses data with same filters
  const {
    data: expensesData,
    loading: expensesLoading,
    error: expensesError
  } = useExpenses(branchFilter || "All", dateRange)


  // Calculate P&L data from invoice and expenses data
  const profitAndLossData = React.useMemo((): ProfitAndLossData => {
    const totalSales = invoiceData?.reduce((sum, invoice) => sum + (invoice.total_sale_price || 0), 0) || 0
    const costOfGoodsSold = invoiceData?.reduce((sum, invoice) => sum + (invoice.total_cost || 0), 0) || 0
    const grossProfit = totalSales - costOfGoodsSold
    const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0
    
    const totalExpenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0
    
    const netProfit = grossProfit - totalExpenses
    const netProfitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

    return {
      totalSales,
      costOfGoodsSold,
      grossProfit,
      grossProfitMargin,
      totalExpenses,
      netProfit,
      netProfitMargin
    }
  }, [invoiceData, expensesData])

  if (invoiceLoading || expensesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Statement of Profit and Loss
          </CardTitle>
          <CardDescription>
            Financial performance summary based on invoice data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                  <Skeleton className="h-8 w-[120px]" />
                  <Skeleton className="h-3 w-[80px] mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invoiceError || expensesError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Statement of Profit and Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading financial data: {invoiceError || expensesError}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { totalSales, costOfGoodsSold, grossProfit, grossProfitMargin, totalExpenses, netProfit, netProfitMargin } = profitAndLossData

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Statement of Profit and Loss
        </CardTitle>
        <CardDescription>
          Financial performance summary based on {invoiceData.length} invoices and {expensesData?.length || 0} expenses
          <div className="flex items-center gap-2 mt-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Data sourced from profit by invoice analysis and expenses</span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 w-full max-w-full overflow-x-hidden">
          {/* Total Sales */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(totalSales)}</p>
                <Badge variant="default" className="text-xs">
                  Revenue
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total sales from all invoices
              </p>
            </CardContent>
          </Card>

          {/* Cost of Goods Sold */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Cost of Goods Sold</p>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(costOfGoodsSold)}</p>
                <Badge variant="destructive" className="text-xs">
                  COGS
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total cost from all invoices
              </p>
            </CardContent>
          </Card>

          {/* Gross Profit */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(grossProfit)}</p>
                <Badge variant={grossProfit >= 0 ? "default" : "destructive"} className="text-xs">
                  {grossProfit >= 0 ? "Profit" : "Loss"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sales minus cost of goods
              </p>
            </CardContent>
          </Card>

          {/* Gross Profit Margin */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Gross Profit Margin</p>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{grossProfitMargin.toFixed(1)}%</p>
                <Badge variant={grossProfitMargin >= 0 ? "default" : "destructive"} className="text-xs">
                  {grossProfitMargin >= 0 ? "Positive" : "Negative"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Profit as % of sales
              </p>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(totalExpenses)}</p>
                <Badge variant="secondary" className="text-xs">
                  Operating
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total operating expenses
              </p>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(netProfit)}</p>
                <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="text-xs">
                  {netProfit >= 0 ? "Profit" : "Loss"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Final bottom line profit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profit & Loss Statement</CardTitle>
            <CardDescription>Detailed breakdown of financial performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Revenue Section */}
              <div className="flex justify-between items-center py-3 border-b">
                <div className="font-semibold text-lg">Revenue</div>
                <div></div>
              </div>
              <div className="flex justify-between items-center pl-4">
                <div className="text-muted-foreground">Total Sales</div>
                <div className="font-medium">{formatCurrencyTable(totalSales)}</div>
              </div>
              <div className="flex justify-between items-center font-semibold border-b pb-3">
                <div>Total Revenue</div>
                <div>{formatCurrencyTable(totalSales)}</div>
              </div>

              {/* Cost Section */}
              <div className="flex justify-between items-center py-3 border-b">
                <div className="font-semibold text-lg">Cost of Sales</div>
                <div></div>
              </div>
              <div className="flex justify-between items-center pl-4">
                <div className="text-muted-foreground">Cost of Goods Sold</div>
                <div className="font-medium">({formatCurrencyTable(costOfGoodsSold)})</div>
              </div>
              <div className="flex justify-between items-center font-semibold border-b pb-3">
                <div>Total Cost of Sales</div>
                <div>({formatCurrencyTable(costOfGoodsSold)})</div>
              </div>

              {/* Gross Profit Section */}
              <div className="flex justify-between items-center py-4 bg-muted/50 px-4 rounded-lg">
                <div className="font-bold text-lg">Gross Profit</div>
                <div className="font-bold text-lg">
                  <Badge variant={grossProfit >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                    {formatCurrencyTable(grossProfit)}
                  </Badge>
                </div>
              </div>

              {/* Margin Analysis */}
              <div className="flex justify-between items-center py-3 bg-primary/5 px-4 rounded-lg">
                <div className="font-semibold">Gross Profit Margin</div>
                <div className="font-semibold">
                  <Badge variant={grossProfitMargin >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                    {grossProfitMargin.toFixed(2)}%
                  </Badge>
                </div>
              </div>

              {/* Operating Expenses Section */}
              <div className="flex justify-between items-center py-3 border-b">
                <div className="font-semibold text-lg">Operating Expenses</div>
                <div></div>
              </div>
              
              {/* Individual Expenses Breakdown */}
              {expensesData && expensesData.length > 0 && (
                <div className="pl-4 space-y-2 py-2">
                  {expensesData
                    .sort((a, b) => (b.amount || 0) - (a.amount || 0)) // Sort by amount descending
                    .slice(0, 10) // Show top 10 expenses
                    .map((expense, index) => {
                      const percentage = totalExpenses > 0 ? ((expense.amount || 0) / totalExpenses) * 100 : 0
                      const shortDescription = expense.description.length > 40 
                        ? expense.description.substring(0, 40) + '...' 
                        : expense.description
                      const mediumDescription = expense.description.length > 80
                        ? expense.description.substring(0, 80) + '...'
                        : expense.description
                      
                      return (
                        <div key={`${expense.date}-${index}`} className="flex justify-between items-center">
                          <div className="flex-1 min-w-0 pr-2">
                            {/* Mobile and Small screens - truncated */}
                            <div className="text-xs text-muted-foreground truncate sm:hidden" title={expense.description}>
                              {shortDescription}
                            </div>
                            {/* Medium screens - medium length */}
                            <div className="text-xs text-muted-foreground truncate hidden sm:block xl:hidden" title={expense.description}>
                              {mediumDescription}
                            </div>
                            {/* Large screens - full description */}
                            <div className="text-xs text-muted-foreground hidden xl:block break-words" title={expense.description}>
                              {expense.description}
                            </div>
                            <div className="text-xs text-muted-foreground/80">
                              {expense.date} • {expense.branch_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {percentage.toFixed(1)}%
                            </Badge>
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatCurrencyTable(expense.amount || 0)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  
                  {expensesData.length > 10 && (
                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                      <div className="text-xs text-muted-foreground italic">
                        +{expensesData.length - 10} more expenses
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrencyTable(
                          expensesData.slice(10).reduce((sum, exp) => sum + (exp.amount || 0), 0)
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center font-semibold border-b pb-3">
                <div>Total Operating Expenses</div>
                <div>({formatCurrencyTable(totalExpenses)})</div>
              </div>

              {/* Net Profit Section */}
              <div className="flex justify-between items-center py-4 bg-green-50 dark:bg-green-950/30 px-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="font-bold text-lg text-green-800 dark:text-green-200">Net Profit</div>
                <div className="font-bold text-lg">
                  <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                    {formatCurrencyTable(netProfit)}
                  </Badge>
                </div>
              </div>

              {/* Net Profit Margin Analysis */}
              <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-950/30 px-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="font-semibold text-blue-800 dark:text-blue-200">Net Profit Margin</div>
                <div className="font-semibold">
                  <Badge variant={netProfitMargin >= 0 ? "default" : "destructive"} className="text-base px-3 py-1">
                    {netProfitMargin.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}