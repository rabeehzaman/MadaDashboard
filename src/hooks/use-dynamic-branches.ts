"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { DateRange } from "@/components/dashboard/date-filter"
import { format } from "date-fns"

export function useDynamicBranches(dateRange?: DateRange) {
  const [branches, setBranches] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBranches() {
      try {
        setLoading(true)
        setError(null)
        
        let query = supabase
          .from('expense_details_view')
          .select('branch_name')
          .not('branch_name', 'is', null)

        // Apply date range filter if provided
        if (dateRange?.from) {
          const fromDate = format(dateRange.from, 'yyyy-MM-dd')
          query = query.gte('date', fromDate)
        }
        
        if (dateRange?.to) {
          const toDate = format(dateRange.to, 'yyyy-MM-dd')
          query = query.lte('date', toDate)
        }

        const { data: branchData, error: fetchError } = await query

        if (fetchError) {
          console.error('Error fetching branches:', fetchError)
          setError(fetchError.message)
          return
        }

        // Get unique branch names and add "All" option
        const uniqueBranches = Array.from(
          new Set(branchData?.map(item => item.branch_name) || [])
        ).sort()
        
        setBranches(['All', ...uniqueBranches])
      } catch (err) {
        console.error('Error in fetchBranches:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [dateRange])

  return { branches, loading, error }
}