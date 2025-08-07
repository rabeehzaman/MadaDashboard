"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useCustomerAgingData } from "@/hooks/use-customer-aging-kpis"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  Users, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Crown
} from "lucide-react"

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('SAR', 'SAR ')
}

const getPerformanceBadge = (overduePercentage: number) => {
  if (overduePercentage <= 10) return { variant: 'default' as const, text: 'Excellent', icon: TrendingUp }
  if (overduePercentage <= 25) return { variant: 'secondary' as const, text: 'Good', icon: TrendingUp }
  if (overduePercentage <= 40) return { variant: 'outline' as const, text: 'Fair', icon: TrendingDown }
  return { variant: 'destructive' as const, text: 'Poor', icon: TrendingDown }
}

interface CustomerOwnerData {
  owner_name: string
  total_customers: number
  customers_with_balance: number
  total_receivables: number
  current_amount: number
  overdue_amount: number
  overdue_percentage: number
  avg_balance_per_customer: number
  high_risk_customers: number
  performance_rank: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: CustomerOwnerData
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{label}</p>
        <p className="text-sm">
          <span className="text-muted-foreground">Receivables: </span>
          {formatCurrency(data.total_receivables)}
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Overdue: </span>
          {data.overdue_percentage.toFixed(1)}%
        </p>
        <p className="text-sm">
          <span className="text-muted-foreground">Customers: </span>
          {data.customers_with_balance}
        </p>
      </div>
    )
  }
  return null
}

function OwnerSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

interface CustomerOwnerPerformanceProps {
  selectedOwner?: string
}

export function CustomerOwnerPerformance({ selectedOwner }: CustomerOwnerPerformanceProps) {
  const { data: agingData, loading, error } = useCustomerAgingData()

  // Process data to get owner performance
  const ownerPerformance = React.useMemo(() => {
    if (!agingData) return []

    const ownerStats = new Map<string, {
      total_customers: number
      customers_with_balance: number
      total_receivables: number
      current_amount: number
      overdue_amount: number
      high_risk_customers: number
    }>()

    // Group data by customer owner
    agingData.forEach(customer => {
      const owner = customer.customer_owner_name_custom || 'Unassigned'
      
      if (!ownerStats.has(owner)) {
        ownerStats.set(owner, {
          total_customers: 0,
          customers_with_balance: 0,
          total_receivables: 0,
          current_amount: 0,
          overdue_amount: 0,
          high_risk_customers: 0
        })
      }

      const stats = ownerStats.get(owner)!
      const totalBalance = parseFloat(customer.total_balance.toString())
      const currentAmount = parseFloat(customer.current_0_30.toString())
      const overdueAmount = parseFloat(customer.past_due_31_60.toString()) + 
                          parseFloat(customer.past_due_61_90.toString()) + 
                          parseFloat(customer.past_due_91_180.toString()) + 
                          parseFloat(customer.past_due_over_180.toString())

      stats.total_customers += 1
      stats.customers_with_balance += 1
      stats.total_receivables += totalBalance
      stats.current_amount += currentAmount
      stats.overdue_amount += overdueAmount
      
      if (parseFloat(customer.past_due_over_180.toString()) > 0) {
        stats.high_risk_customers += 1
      }
    })

    // Convert to array and calculate performance metrics
    const result: CustomerOwnerData[] = Array.from(ownerStats.entries()).map(([owner_name, stats]) => ({
      owner_name,
      total_customers: stats.total_customers,
      customers_with_balance: stats.customers_with_balance,
      total_receivables: stats.total_receivables,
      current_amount: stats.current_amount,
      overdue_amount: stats.overdue_amount,
      overdue_percentage: stats.total_receivables > 0 ? (stats.overdue_amount / stats.total_receivables) * 100 : 0,
      avg_balance_per_customer: stats.customers_with_balance > 0 ? stats.total_receivables / stats.customers_with_balance : 0,
      high_risk_customers: stats.high_risk_customers,
      performance_rank: 0 // Will be set after sorting
    }))

    // Sort by overdue percentage (ascending = better performance)
    result.sort((a, b) => a.overdue_percentage - b.overdue_percentage)
    
    // Set performance ranks
    result.forEach((owner, index) => {
      owner.performance_rank = index + 1
    })

    // Filter by selected owner if specified
    if (selectedOwner && selectedOwner !== 'All') {
      return result.filter(owner => owner.owner_name === selectedOwner)
    }

    return result
  }, [agingData, selectedOwner])

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          <CardDescription>Failed to load customer owner performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Owner Performance
          </CardTitle>
          <CardDescription>Collection efficiency by sales person</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mb-6">
            <Skeleton className="w-full h-full" />
          </div>
          <div>
            {[...Array(4)].map((_, i) => (
              <OwnerSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!ownerPerformance || ownerPerformance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Owner Performance
          </CardTitle>
          <CardDescription>Collection efficiency by sales person</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No owner performance data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer Owner Performance
        </CardTitle>
        <CardDescription>
          Collection efficiency and receivables management by sales person
          {selectedOwner && selectedOwner !== 'All' && (
            <span className="ml-2 text-primary font-medium">• Filtered by: {selectedOwner}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="h-64 w-full mb-6 overflow-x-auto">
          <div className="min-w-[600px] h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="owner_name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={10}
                  interval={0}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  fontSize={10}
                  className="fill-muted-foreground"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="total_receivables" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Owner Details */}
        <div className="space-y-0 border rounded-lg">
          {ownerPerformance.map((owner) => {
            const performanceBadge = getPerformanceBadge(owner.overdue_percentage)
            const PerformanceIcon = performanceBadge.icon
            
            return (
              <div 
                key={owner.owner_name} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {owner.performance_rank === 1 && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      #{owner.performance_rank}
                    </span>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{owner.owner_name}</div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">👥 {owner.customers_with_balance} customers</span>
                      <span className="whitespace-nowrap">⚠️ {owner.high_risk_customers} high risk</span>
                      <span className="whitespace-nowrap">💰 {formatCurrency(owner.avg_balance_per_customer)} avg</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-sm sm:text-base">
                      {formatCurrency(owner.total_receivables)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {owner.overdue_percentage.toFixed(1)}% overdue
                    </div>
                  </div>
                  
                  <Badge variant={performanceBadge.variant} className="gap-1">
                    <PerformanceIcon className="h-3 w-3" />
                    {performanceBadge.text}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Owners:</span>
              <span className="ml-2 font-medium">{ownerPerformance.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Best Performer:</span>
              <span className="ml-2 font-medium text-green-600">
                {ownerPerformance[0]?.owner_name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Customers:</span>
              <span className="ml-2 font-medium">
                {ownerPerformance.reduce((sum, owner) => sum + owner.customers_with_balance, 0)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Combined Receivables:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(
                  ownerPerformance.reduce((sum, owner) => sum + owner.total_receivables, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}