"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Available branches from the database
const BRANCHES = [
  "Main Branch",
  "SEB VEHICLE", 
  "Rashid S Man",
  "Asir S Man",
  "Shahid S Man",
  "Jamshid S Man",
  "MAJEED"
]

interface BranchFilterProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  className?: string
}

export function BranchFilter({ value, onValueChange, className }: BranchFilterProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(newValue) => onValueChange(newValue === "all" ? undefined : newValue)}
    >
      <SelectTrigger className={cn("w-[200px] min-h-[44px] hover:border-primary focus:ring-primary focus:border-primary", className)}>
        <Building2 className="h-4 w-4" />
        <SelectValue placeholder="All Branches" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Branches</SelectItem>
        {BRANCHES.map((branch) => (
          <SelectItem key={branch} value={branch}>
            {branch}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export type BranchFilterValue = string | undefined