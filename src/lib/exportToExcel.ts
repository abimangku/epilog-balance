import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, JSON.stringify(r).length), 10)
  worksheet['!cols'] = [{ wch: Math.min(maxWidth, 50) }]
  
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
