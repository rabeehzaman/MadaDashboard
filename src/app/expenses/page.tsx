"use client"

import * as React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { DateFilter, type DateRange } from "@/components/dashboard/date-filter"
import { BranchFilter, type BranchFilterValue } from "@/components/dashboard/branch-filter"
import { startOfMonth, endOfDay } from "date-fns"

export default function ExpensesPage() {
  const [dateRange, setDateRange] = React.useState<DateRange>(() => {
    const now = new Date()
    return {
      from: startOfMonth(now),  
      to: endOfDay(now) // Month to date
    }
  })
  const [branchFilter, setBranchFilter] = React.useState<BranchFilterValue>(undefined)

  return (
    <DashboardLayout>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full max-w-full overflow-x-hidden">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Expenses Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor and analyze all business expenses across branches
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto max-w-full overflow-x-hidden">
          <BranchFilter 
            value={branchFilter}
            onValueChange={setBranchFilter}
            className="w-full sm:w-auto min-h-[44px]"
            dateRange={dateRange}
          />
          <DateFilter 
            onDateRangeChange={setDateRange}
            className="w-full sm:w-auto min-h-[44px]"
          />
        </div>
      </div>
      
      {/* Expenses Table */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">All Expenses</h3>
        <ExpensesTable branchFilter={branchFilter} dateRange={dateRange} />
      </div>
    </DashboardLayout>
  )
}