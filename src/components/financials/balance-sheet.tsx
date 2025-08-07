"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Scale, Building, Package, Users, TrendingUp } from "lucide-react"
import { formatCurrencyTable } from "@/lib/formatting"
import { useBalanceSheet } from "@/hooks/use-balance-sheet"
import { BalanceSheetBranchFilter, type BalanceSheetBranchFilterValue } from "./balance-sheet-branch-filter"
import type { DateRange } from "@/components/dashboard/date-filter"

interface BalanceSheetProps {
  dateRange?: DateRange
  branchFilter?: string
}

export function BalanceSheet({ dateRange }: BalanceSheetProps) {
  const [balanceSheetBranchFilter, setBalanceSheetBranchFilter] = React.useState<BalanceSheetBranchFilterValue>(undefined)
  const { data, loading, error } = useBalanceSheet(dateRange, balanceSheetBranchFilter)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Balance Sheet
          </CardTitle>
          <CardDescription>
            Statement of financial position showing assets and liabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Balance Sheet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading balance sheet data: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { totalReceivables, totalStock, totalAssets, totalVendorPayable, totalLiabilities, netWorth } = data

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Balance Sheet
            </CardTitle>
            <CardDescription>
              Statement of financial position showing assets and liabilities
              <div className="flex items-center gap-2 mt-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Data sourced from customer receivables, stock, and vendor balances</span>
              </div>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <BalanceSheetBranchFilter 
              value={balanceSheetBranchFilter}
              onValueChange={setBalanceSheetBranchFilter}
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-full overflow-x-hidden">
          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <Building className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(totalAssets)}</p>
                <Badge variant="default" className="text-xs">
                  Assets
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Receivables + Stock
              </p>
            </CardContent>
          </Card>

          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(totalLiabilities)}</p>
                <Badge variant="destructive" className="text-xs">
                  Liabilities
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Vendor payables
              </p>
            </CardContent>
          </Card>

          <Card className="w-full max-w-full">
            <CardContent className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-xl sm:text-2xl font-bold break-all">{formatCurrencyTable(netWorth)}</p>
                <Badge variant={netWorth >= 0 ? "default" : "destructive"} className="text-xs">
                  {netWorth >= 0 ? "Positive" : "Negative"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Assets minus Liabilities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* T-Shaped Balance Sheet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance Sheet Statement</CardTitle>
            <CardDescription>T-shaped format showing the fundamental accounting equation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 w-full max-w-full overflow-x-hidden">
              {/* Assets Side */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b-2 border-primary">
                  <div className="font-bold text-lg text-primary">ASSETS</div>
                  <Building className="h-5 w-5 text-primary" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="font-semibold">Current Assets</div>
                    <div></div>
                  </div>
                  
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm truncate">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Total Receivables</span>
                    </div>
                    <div className="font-medium text-sm sm:text-base break-all">{formatCurrencyTable(totalReceivables)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm truncate">
                      <Package className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Total Stock</span>
                    </div>
                    <div className="font-medium text-sm sm:text-base break-all">{formatCurrencyTable(totalStock)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold border-t-2 border-primary pt-3 bg-primary/5 px-4 py-3 rounded-lg">
                    <div className="text-primary">TOTAL ASSETS</div>
                    <div className="text-primary text-lg">
                      <Badge variant="default" className="text-base px-3 py-1">
                        {formatCurrencyTable(totalAssets)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Liabilities Side */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b-2 border-destructive">
                  <div className="font-bold text-lg text-destructive">LIABILITIES</div>
                  <Users className="h-5 w-5 text-destructive" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-dashed">
                    <div className="font-semibold">Current Liabilities</div>
                    <div></div>
                  </div>
                  
                  <div className="flex justify-between items-center pl-2 sm:pl-4">
                    <div className="text-muted-foreground flex items-center gap-2 text-sm truncate">
                      <Building className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Total Vendor Payable</span>
                    </div>
                    <div className="font-medium text-sm sm:text-base break-all">{formatCurrencyTable(totalVendorPayable)}</div>
                  </div>
                  
                  <div className="flex justify-between items-center font-bold border-t-2 border-destructive pt-3 bg-destructive/5 px-4 py-3 rounded-lg">
                    <div className="text-destructive">TOTAL LIABILITIES</div>
                    <div className="text-destructive text-lg">
                      <Badge variant="destructive" className="text-base px-3 py-1">
                        {formatCurrencyTable(totalLiabilities)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Worth Calculation */}
            <div className="mt-8 pt-6 border-t-2">
              <div className="flex justify-between items-center py-4 bg-green-50 dark:bg-green-950/30 px-6 rounded-lg border-2 border-green-200 dark:border-green-800">
                <div className="font-bold text-xl text-green-800 dark:text-green-200 flex items-center gap-2">
                  <Scale className="h-6 w-6" />
                  NET WORTH (Assets - Liabilities)
                </div>
                <div className="font-bold text-xl">
                  <Badge variant={netWorth >= 0 ? "default" : "destructive"} className="text-lg px-4 py-2">
                    {formatCurrencyTable(netWorth)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Balance Verification */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-center">
                <div className="font-semibold mb-2">Balance Sheet Equation Verification</div>
                <div className="text-muted-foreground">
                  Assets ({formatCurrencyTable(totalAssets)}) = Liabilities ({formatCurrencyTable(totalLiabilities)}) + Net Worth ({formatCurrencyTable(netWorth)})
                </div>
                <div className="mt-2">
                  <Badge variant={Math.abs(totalAssets - (totalLiabilities + netWorth)) < 0.01 ? "default" : "destructive"} className="text-xs">
                    {Math.abs(totalAssets - (totalLiabilities + netWorth)) < 0.01 ? "✓ Balanced" : "⚠ Imbalanced"}
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