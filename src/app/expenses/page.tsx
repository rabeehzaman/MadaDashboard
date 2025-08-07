"use client"

import * as React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ExpensesTable } from "@/components/expenses/expenses-table"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useBranches } from "@/hooks/use-branches"
import { DateFilter, type DateRange } from "@/components/dashboard/date-filter"
import { startOfMonth, endOfDay } from "date-fns"

export default function ExpensesPage() {
  const [selectedBranch, setSelectedBranch] = React.useState<string>("All")
  const [dateRange, setDateRange] = React.useState<DateRange>(() => {
    const now = new Date()
    return {
      from: startOfMonth(now),  
      to: endOfDay(now) // Month to date
    }
  })
  const { branches: availableBranches, loading: branchesLoading } = useBranches()

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Expenses Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor and analyze all business expenses across branches
          </p>
        </div>
      </div>
      
      {/* Master Branch Filter */}
      {!branchesLoading && (
        <div className="flex flex-col gap-4 mb-6 p-3 sm:p-4 bg-muted/30 rounded-lg">
          <div>
            <h3 className="font-medium text-sm sm:text-base">Expenses Dashboard Filters</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Filter expenses by branch location and date range (defaults to current month)
            </p>
          </div>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Branch:</span>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">Date Range:</span>
              <DateFilter 
                onDateRangeChange={setDateRange}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Expenses Table */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">All Expenses</h3>
        <ExpensesTable selectedBranch={selectedBranch} dateRange={dateRange} />
      </div>
    </DashboardLayout>
  )
}