"use client"

import * as React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { KPICards, ExtendedKPICards } from "@/components/dashboard/kpi-cards"
import { OptimizedTabbedTables } from "@/components/dashboard/optimized-tabbed-tables"
import { ChartsSection } from "@/components/dashboard/charts-section"
// Removed PerformanceStatus import
import { DateFilter, type DateRange } from "@/components/dashboard/date-filter"
import { BranchFilter, type BranchFilterValue } from "@/components/dashboard/branch-filter"
import { startOfMonth, endOfDay } from "date-fns"
import { useLocale } from "@/i18n/locale-provider"

export default function Home() {
  const { t, isArabic } = useLocale()
  const [dateRange, setDateRange] = React.useState<DateRange>(() => {
    const now = new Date()
    return {
      from: startOfMonth(now),  
      to: endOfDay(now) // Month to date, not full month
    }
  })
  const [branchFilter, setBranchFilter] = React.useState<BranchFilterValue>(undefined)

  return (
    <DashboardLayout>
      {/* Filters */}
      <div className={`filter-controls flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between w-full max-w-full overflow-x-hidden ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
        <h2 className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${isArabic ? 'text-right' : ''}`}>{t("dashboard.overview")}</h2>
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 w-full sm:w-auto max-w-full overflow-x-hidden ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
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
      
      {/* Main KPI Cards */}
      <KPICards dateRange={dateRange} branchFilter={branchFilter} />
      
      {/* Extended KPIs */}
      <ExtendedKPICards dateRange={dateRange} branchFilter={branchFilter} />
      
      {/* Business Analytics Charts */}
      <ChartsSection dateRange={dateRange} branchFilter={branchFilter} />
      
      {/* Optimized Tabbed Data Tables */}
      <div className="table-container">
        <OptimizedTabbedTables dateRange={dateRange} branchFilter={branchFilter} />
      </div>
    </DashboardLayout>
  )
}
