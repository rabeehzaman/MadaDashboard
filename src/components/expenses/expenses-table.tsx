"use client"

import * as React from "react"
import { useExpenses } from "@/hooks/use-expenses"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/formatting"
import { useLocale } from "@/i18n/locale-provider"
import { format } from "date-fns"
import type { DateRange } from "@/components/dashboard/date-filter"
import type { BranchFilterValue } from "@/components/dashboard/branch-filter"

interface ExpensesTableProps {
  branchFilter: BranchFilterValue
  dateRange: DateRange
}

export function ExpensesTable({ branchFilter, dateRange }: ExpensesTableProps) {
  const { t } = useLocale()
  const { data: expenses, loading, error } = useExpenses(branchFilter, dateRange)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Filter and sort expenses based on search term (biggest first)
  const filteredExpenses = React.useMemo(() => {
    const filtered = searchTerm 
      ? (expenses || []).filter(expense =>
          expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          expense.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : expenses || []
    
    // Sort by amount (biggest first)
    return [...filtered].sort((a, b) => {
      const amountA = typeof a.amount === 'string' ? parseFloat(a.amount) || 0 : a.amount
      const amountB = typeof b.amount === 'string' ? parseFloat(b.amount) || 0 : b.amount
      return amountB - amountA
    })
  }, [expenses, searchTerm])

  // Calculate total amount
  const totalAmount = React.useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => {
      const amount = typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : expense.amount
      return sum + amount
    }, 0)
  }, [filteredExpenses])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pages.expenses.loading_expenses")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-64 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("pages.expenses.error_loading_expenses")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{t("pages.expenses.error_loading_message")}{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("pages.expenses.expenses_table_title")}</CardTitle>
        <CardDescription>
          {filteredExpenses.length} {t("pages.expenses.expenses_count")} {expenses?.length || 0} {t("pages.expenses.expenses_plural")}
          {branchFilter && ` • ${t("pages.expenses.filtered_by")}${branchFilter}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-4">
          <Input
            placeholder={t("pages.expenses.search_placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead>Branch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold border-b-2">
                <TableCell className="font-bold">{t("pages.expenses.total_row")}</TableCell>
                <TableCell className="font-bold">
                  {filteredExpenses.length} {filteredExpenses.length !== 1 ? t("pages.expenses.expenses_plural") : t("pages.expenses.expense_singular")}
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {formatCurrency(totalAmount)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  100.0%
                </TableCell>
                <TableCell className="font-bold">
                  {branchFilter ? branchFilter : t("pages.expenses.all_branches")}
                </TableCell>
              </TableRow>
              
              {/* Expense Rows */}
              {filteredExpenses.map((expense, index) => {
                const expenseAmount = typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : expense.amount
                const percentage = totalAmount > 0 ? (expenseAmount / totalAmount) * 100 : 0
                
                return (
                  <TableRow key={index}>
                    <TableCell>
                      {expense.date 
                        ? format(new Date(expense.date), "MMM dd, yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium whitespace-normal break-words">
                        {expense.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expenseAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap">
                        {expense.branch_name}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            {filteredExpenses.length === 0 && (
              <TableCaption>
                {searchTerm ? t("pages.expenses.no_match_search") : t("pages.expenses.no_expenses_found")}
              </TableCaption>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}