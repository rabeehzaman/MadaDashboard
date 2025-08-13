"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useActiveBranches } from "@/hooks/use-active-branches"
import type { DateRange } from "@/components/dashboard/date-filter"

interface BranchFilterProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  className?: string
  dateRange?: DateRange
}

export function BranchFilter({ value, onValueChange, className, dateRange }: BranchFilterProps) {
  const { branches, loading, error } = useActiveBranches(dateRange)

  // Reset branch filter when active branches change and current selection is not available
  React.useEffect(() => {
    if (!loading && value && !branches.includes(value)) {
      onValueChange(undefined)
    }
  }, [branches, value, loading, onValueChange])

  return (
    <Select
      value={value || "all"}
      onValueChange={(newValue) => onValueChange(newValue === "all" ? undefined : newValue)}
      disabled={loading}
    >
      <SelectTrigger className={cn("w-[200px] min-h-[44px] hover:border-primary focus:ring-primary focus:border-primary", className)}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
        <SelectValue placeholder={loading ? "Loading..." : "All Branches"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Branches</SelectItem>
        {error ? (
          <SelectItem value="error" disabled>Error loading branches</SelectItem>
        ) : (
          branches.map((branch) => (
            <SelectItem key={branch} value={branch}>
              {branch}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}

export type BranchFilterValue = string | undefined