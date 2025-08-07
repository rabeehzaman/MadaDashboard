"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useCustomerAgingSummaryKPIs } from "@/hooks/use-customer-aging-kpis"
import { 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle 
} from "lucide-react"

const formatCurrency = (amount: string) => {
  const numAmount = parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount).replace('SAR', 'SAR ')
}

const formatPercentage = (percentage: string) => `${percentage}%`

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: {
    text: string
    variant: "default" | "secondary" | "destructive" | "outline"
  }
  loading?: boolean
}

function KPICard({ title, value, subtitle, icon: Icon, badge, loading }: KPICardProps) {
  if (loading) {
    return (
      <Card className="border-l-4" style={{ borderLeftColor: '#c96442' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-l-4" style={{ borderLeftColor: '#c96442' }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        <div style={{ color: '#c96442' }}>
          <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-lg sm:text-2xl font-bold" style={{ color: '#b8592f' }}>{value}</div>
          {badge && (
            <Badge variant={badge.variant} className="text-xs self-start sm:self-auto">
              {badge.text}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface CustomerAgingKPICardsProps {
  selectedOwner?: string
}

export function CustomerAgingKPICards({ selectedOwner }: CustomerAgingKPICardsProps) {
  const { data, loading, error } = useCustomerAgingSummaryKPIs(selectedOwner)

  if (error) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-red-200">
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Failed to load KPIs</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Receivables */}
      <KPICard
        title="Total Receivables"
        value={data ? formatCurrency(data.total_receivables) : "Loading..."}
        subtitle={data ? `${data.total_customers_with_balance} customers with balance` : undefined}
        icon={DollarSign}
        badge={data ? {
          text: `${data.total_outstanding_invoices} invoices`,
          variant: "secondary"
        } : undefined}
        loading={loading}
      />

      {/* Current (0-30 days) */}
      <KPICard
        title="Current (0-30 days)"
        value={data ? formatPercentage(data.current_percentage) : "Loading..."}
        subtitle={data ? `${formatCurrency(data.current_amount)} from ${data.current_customers_count} customers` : undefined}
        icon={Users}
        badge={data ? {
          text: "Good",
          variant: "default"
        } : undefined}
        loading={loading}
      />

      {/* Past Due (31-180 days) */}
      <KPICard
        title="Past Due (31-180 days)"
        value={data ? formatPercentage(
          (parseFloat(data.past_due_31_60_percentage) + 
           parseFloat(data.past_due_61_90_percentage) + 
           parseFloat(data.past_due_91_180_percentage)).toFixed(2)
        ) : "Loading..."}
        subtitle={data ? `${
          data.past_due_31_60_count + 
          data.past_due_61_90_count + 
          data.past_due_91_180_count
        } customers need attention` : undefined}
        icon={Clock}
        badge={data ? {
          text: "Watch",
          variant: "outline"
        } : undefined}
        loading={loading}
      />

      {/* High Risk (180+ days) */}
      <KPICard
        title="High Risk (180+ days)"
        value={data ? formatPercentage(data.over_180_percentage) : "Loading..."}
        subtitle={data ? `${formatCurrency(data.over_180_amount)} from ${data.over_180_count} customers` : undefined}
        icon={AlertTriangle}
        badge={data ? {
          text: "Critical",
          variant: "destructive"
        } : undefined}
        loading={loading}
      />
    </div>
  )
}