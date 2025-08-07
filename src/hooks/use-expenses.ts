"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { DateRange } from "@/components/dashboard/date-filter"
import { format } from "date-fns"

export interface ExpenseRecord {
  date: string
  description: string
  amount: number | string // Allow both since Supabase returns string
  branch_name: string
}

export function useExpenses(selectedBranch: string = "All", dateRange?: DateRange) {
  const [data, setData] = useState<ExpenseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExpenses() {
      try {
        setLoading(true)
        setError(null)
        
        let query = supabase
          .from('expense_details_view')
          .select('*')
          .order('date', { ascending: false })

        // Apply branch filter if not "All"
        if (selectedBranch !== "All") {
          query = query.eq('branch_name', selectedBranch)
        }

        // Apply date range filter if provided
        if (dateRange?.from) {
          const fromDate = format(dateRange.from, 'yyyy-MM-dd')
          query = query.gte('date', fromDate)
        }
        
        if (dateRange?.to) {
          const toDate = format(dateRange.to, 'yyyy-MM-dd')
          query = query.lte('date', toDate)
        }

        const { data: expenses, error: fetchError } = await query

        if (fetchError) {
          console.error('Error fetching expenses:', fetchError)
          setError(fetchError.message)
          return
        }

        // Convert amount from string to number since Supabase returns numeric as string
        const processedExpenses = (expenses || []).map(expense => ({
          ...expense,
          amount: parseFloat(expense.amount) || 0
        }))


        setData(processedExpenses)
      } catch (err) {
        console.error('Error in fetchExpenses:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchExpenses()
  }, [selectedBranch, dateRange])

  return { data, loading, error }
}