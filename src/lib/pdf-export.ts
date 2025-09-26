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

  // Create PDF in landscape orientation for better table fit
  const doc = new jsPDF({
    orientation: 'landscape',
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

  // Add header
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(`Stock Report - ${warehouseName}`, 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on: ${dateStr} at ${timeStr}`, 14, 28)

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

  // Prepare table data
  const tableData = stockData.map(item => [
    item.product_name,
    formatNumber(item.stock_quantity || 0),
    formatNumber(item.stock_in_pieces || 0),
    formatCurrencyTable(item.unit_cost || 0),
    formatCurrencyTable(item.current_stock_value || 0),
    formatCurrencyTable(item.stock_value_with_vat || 0),
    '' // Empty cell for manual stock entry
  ])

  // Add totals row
  const totalsRow = [
    'TOTAL',
    formatNumber(totals.stockQty),
    formatNumber(totals.stockInPieces),
    '-',
    formatCurrencyTable(totals.totalCost),
    formatCurrencyTable(totals.totalCostWithVat),
    ''
  ]

  // Generate the table with autoTable
  autoTable(doc, {
    head: [headers],
    body: tableData,
    foot: [totalsRow],
    startY: 35,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 139, 202], // Bootstrap primary blue
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { // Product Name
        halign: 'left',
        cellWidth: 65
      },
      1: { // Stock Qty
        halign: 'right',
        cellWidth: 25
      },
      2: { // Stock in Pcs
        halign: 'right',
        cellWidth: 25
      },
      3: { // Unit Cost
        halign: 'right',
        cellWidth: 30
      },
      4: { // Total Cost
        halign: 'right',
        cellWidth: 35
      },
      5: { // Total Cost with VAT
        halign: 'right',
        cellWidth: 40
      },
      6: { // Actual Stock (blank column)
        halign: 'center',
        cellWidth: 35,
        minCellHeight: 8 // Ensure enough space for manual writing
      }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { top: 35, right: 14, bottom: 20, left: 14 },
    didDrawPage: function(data) {
      // Add page numbers
      const pageCount = doc.getNumberOfPages()
      const currentPage = data.pageNumber
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const pageText = `Page ${currentPage} of ${pageCount}`
      const pageWidth = doc.internal.pageSize.width
      doc.text(pageText, pageWidth - 25, doc.internal.pageSize.height - 10)

      // Add note about the Actual Stock column at the bottom of first page
      if (currentPage === 1) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text('Note: The "Actual Stock" column is provided for manual entry during physical stock verification.', 14, doc.internal.pageSize.height - 10)
      }
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