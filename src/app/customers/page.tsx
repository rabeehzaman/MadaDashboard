"use client"

import * as React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { CustomerAgingBalance } from "@/components/customers/customer-aging-balance"
import { CustomerAgingKPICards } from "@/components/customers/customer-aging-kpi-cards"
import { TopOverdueCustomers } from "@/components/customers/top-overdue-customers"
import { RiskDistributionChart } from "@/components/customers/risk-distribution-chart"
import { CustomerOwnerPerformance } from "@/components/customers/customer-owner-performance"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCustomerOwners } from "@/hooks/use-customer-aging-kpis"
import { useLocale } from "@/i18n/locale-provider"

export default function CustomersPage() {
  const { t } = useLocale()
  const [selectedOwner, setSelectedOwner] = React.useState<string>("All")
  const { owners: availableOwners, loading: ownersLoading } = useCustomerOwners()

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 w-full max-w-full">
        <div className="px-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">{t("pages.customers.title")}</h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-tight">
            {t("pages.customers.description")}
          </p>
        </div>
      </div>
      
      {/* Master Customer Owner Filter */}
      {!ownersLoading && (
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/30 rounded-lg w-full max-w-full overflow-x-hidden">
          <div>
            <h3 className="font-medium text-sm sm:text-base">{t("pages.customers.filter_title")}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("pages.customers.filter_description")}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 w-full">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">{t("pages.customers.customer_owner")}</span>
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="w-full sm:w-[250px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableOwners.map((owner) => (
                  <SelectItem key={owner} value={owner} className="min-h-[44px] flex items-center">
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      {/* KPI Summary Cards */}
      <div className="mb-4 sm:mb-6 w-full max-w-full">
        <CustomerAgingKPICards selectedOwner={selectedOwner} />
      </div>
      
      {/* Charts and Priority Lists */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2 mb-4 sm:mb-6 w-full max-w-full">
        <div className="w-full max-w-full overflow-x-hidden">
          <RiskDistributionChart selectedOwner={selectedOwner} />
        </div>
        <div className="w-full max-w-full overflow-x-hidden">
          <TopOverdueCustomers selectedOwner={selectedOwner} />
        </div>
      </div>
      
      {/* Customer Owner Performance */}
      <div className="mb-4 sm:mb-6 w-full max-w-full overflow-x-hidden">
        <CustomerOwnerPerformance selectedOwner={selectedOwner} />
      </div>
      
      {/* Detailed Customer Aging Table */}
      <div className="w-full max-w-full overflow-x-hidden">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 px-1">{t("pages.customers.detailed_aging")}</h3>
        <CustomerAgingBalance selectedOwner={selectedOwner} />
      </div>
    </DashboardLayout>
  )
}