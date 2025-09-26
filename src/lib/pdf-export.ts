// =============================================================================
// PDF EXPORT UTILITIES FOR STOCK REPORT
// =============================================================================
// Functions for exporting stock report data to PDF format with sorting
// Includes warehouse information and blank column for manual stock entry
// =============================================================================

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrencyTable, formatNumber } from './formatting'
import type { OptimizedStock } from './database-optimized'

// Extend jsPDF with autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number
    }
  }
}

// =============================================================================
// STOCK REPORT PDF EXPORT
// =============================================================================

/**
 * Export stock report to PDF with current sorting and filters
 * Includes an extra blank column for manual stock entry
 */
export function exportStockReportToPDF(
  stockData: OptimizedStock[],
  warehouseFilter?: string,
  filename?: string
): void {
  if (!stockData || stockData.length === 0) {
    console.warn('No stock data to export')
    alert('No stock data found for export.')
    return
  }

  // Create PDF in portrait orientation for more rows
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Get current date and time for the report
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  // Determine warehouse name for the report
  const warehouseName = warehouseFilter || 'All Warehouses'

  // Add header with reduced size and position
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`Stock Report - ${warehouseName}`, 10, 15)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on: ${dateStr} at ${timeStr}`, 10, 21)

  // Calculate totals
  const totals = {
    stockQty: stockData.reduce((sum, item) => sum + (item.stock_quantity || 0), 0),
    stockInPieces: stockData.reduce((sum, item) => sum + (item.stock_in_pieces || 0), 0),
    totalCost: stockData.reduce((sum, item) => sum + (item.current_stock_value || 0), 0),
    totalCostWithVat: stockData.reduce((sum, item) => sum + (item.stock_value_with_vat || 0), 0)
  }

  // Prepare table headers
  const headers = [
    'Product Name',
    'Stock Qty',
    'Stock in Pcs',
    'Unit Cost',
    'Total Cost',
    'Total Cost with VAT',
    'Actual Stock' // Blank column for manual entry
  ]

  // Prepare totals row at the top
  const totalsRow = [
    'TOTAL',
    formatNumber(totals.stockQty),
    formatNumber(totals.stockInPieces),
    '-',
    formatCurrencyTable(totals.totalCost),
    formatCurrencyTable(totals.totalCostWithVat),
    ''
  ]

  // Prepare table data with totals at the beginning
  const stockRows = stockData.map(item => [
    item.product_name,
    formatNumber(item.stock_quantity || 0),
    formatNumber(item.stock_in_pieces || 0),
    formatCurrencyTable(item.unit_cost || 0),
    formatCurrencyTable(item.current_stock_value || 0),
    formatCurrencyTable(item.stock_value_with_vat || 0),
    '' // Empty cell for manual stock entry
  ])

  // Combine totals row at top with a separator row, then stock data
  const tableData = [
    totalsRow,
    ['', '', '', '', '', '', ''], // Empty separator row
    ...stockRows
  ]

  // Generate the table with autoTable
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 25,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202], // Bootstrap primary blue
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { // Product Name
        halign: 'left',
        cellWidth: 50
      },
      1: { // Stock Qty
        halign: 'right',
        cellWidth: 20
      },
      2: { // Stock in Pcs
        halign: 'right',
        cellWidth: 20
      },
      3: { // Unit Cost
        halign: 'right',
        cellWidth: 25
      },
      4: { // Total Cost
        halign: 'right',
        cellWidth: 28
      },
      5: { // Total Cost with VAT
        halign: 'right',
        cellWidth: 32
      },
      6: { // Actual Stock (blank column)
        halign: 'center',
        cellWidth: 25,
        minCellHeight: 6 // Reduced for more rows
      }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { top: 20, right: 10, bottom: 10, left: 10 },
    // Style the totals row differently
    didParseCell: function(data) {
      if (data.row.index === 0) { // First row is totals
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 240, 240]
      } else if (data.row.index === 1) { // Separator row
        data.cell.styles.fillColor = [255, 255, 255]
        data.cell.styles.minCellHeight = 2
      }
    },
    didDrawPage: function(data) {
      // Add page numbers with reduced bottom margin
      const pageCount = doc.getNumberOfPages()
      const currentPage = data.pageNumber
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      const pageText = `Page ${currentPage} of ${pageCount}`
      const pageWidth = doc.internal.pageSize.width
      doc.text(pageText, pageWidth - 20, doc.internal.pageSize.height - 5)
    }
  })

  // Generate filename with timestamp and warehouse name
  const timestamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-')
  const warehouseSlug = warehouseName.toLowerCase().replace(/\s+/g, '_')
  const defaultFilename = `stock_report_${warehouseSlug}_${timestamp}.pdf`

  // Save the PDF
  doc.save(filename || defaultFilename)
}

/**
 * Export stock report with custom columns selection
 * This is for future enhancement if needed
 */
export function exportStockReportWithCustomColumnsToPDF(
  stockData: OptimizedStock[],
  columns: string[],
  warehouseFilter?: string,
  filename?: string
): void {
  // This function can be implemented later for custom column selection
  // For now, we'll use the standard export
  exportStockReportToPDF(stockData, warehouseFilter, filename)
}