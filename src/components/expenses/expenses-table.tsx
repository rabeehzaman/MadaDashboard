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
import { format } from "date-fns"
import type { DateRange } from "@/components/dashboard/date-filter"
import type { BranchFilterValue } from "@/components/dashboard/branch-filter"

interface ExpensesTableProps {
  branchFilter: BranchFilterValue
  dateRange: DateRange
}

export function ExpensesTable({ branchFilter, dateRange }: ExpensesTableProps) {
  const { data: expenses, loading, error } = useExpenses(branchFilter, dateRange)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Filter expenses based on search term
  const filteredExpenses = React.useMemo(() => {
    if (!searchTerm) return expenses || []
    
    return (expenses || []).filter(expense =>
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.branch_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
          <CardTitle>Loading Expenses...</CardTitle>
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
          <CardTitle>Error Loading Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Error loading expenses: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
        <CardDescription>
          {filteredExpenses.length} of {expenses?.length || 0} expenses
          {branchFilter && ` • Filtered by: ${branchFilter}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Input */}
        <div className="mb-4">
          <Input
            placeholder="Search expenses..."
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
                <TableHead>Branch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Total Row */}
              <TableRow className="bg-muted/50 font-semibold border-b-2">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="font-bold">
                  {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {formatCurrency(totalAmount)}
                </TableCell>
                <TableCell className="font-bold">
                  {branchFilter ? branchFilter : "All Branches"}
                </TableCell>
              </TableRow>
              
              {/* Expense Rows */}
              {filteredExpenses.map((expense, index) => (
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
                    {formatCurrency(typeof expense.amount === 'string' ? parseFloat(expense.amount) || 0 : expense.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {expense.branch_name}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {filteredExpenses.length === 0 && (
              <TableCaption>
                {searchTerm ? "No expenses match your search." : "No expenses found."}
              </TableCaption>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}