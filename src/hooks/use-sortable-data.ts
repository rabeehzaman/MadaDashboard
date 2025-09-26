import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc' | null
export type SortConfig<T> = {
  key: keyof T | null
  direction: SortDirection
}

/**
 * Generic hook for sorting table data
 * @param data - Array of data to sort
 * @param defaultSort - Optional default sort configuration
 * @returns sorted data and sort handlers
 */
export function useSortableData<T extends Record<string, any>>(
  data: T[],
  defaultSort: SortConfig<T> = { key: null, direction: null }
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(defaultSort)

  const handleSort = (key: keyof T) => {
    let direction: SortDirection = 'asc'

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    setSortConfig({ key: direction === null ? null : key, direction })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T]
      const bValue = b[sortConfig.key as keyof T]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { numeric: true })
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return sorted
  }, [data, sortConfig])

  return {
    sortedData,
    sortConfig,
    handleSort
  }
}