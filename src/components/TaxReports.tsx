import { useState } from 'react'
import { usePPh23Report, usePPNReport } from '@/hooks/useCriticalFeatures'
import * as XLSX from 'xlsx'

export function TaxReports() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [reportType, setReportType] = useState<'pph23' | 'ppn'>('pph23')

  const { data: pph23Data } = usePPh23Report(reportType === 'pph23' ? period : '')
  const { data: ppnData } = usePPNReport(reportType === 'ppn' ? period : '')

  const handleExportExcel = () => {
    if (reportType === 'pph23' && pph23Data) {
      const rows = [
        ['EPILOG CREATIVE'],
        ['PPh 23 MONTHLY REPORT'],
        [`Period: ${period}`],
        [],
        ['Vendor', 'NPWP', 'Bill #', 'Date', 'Base Amount', 'Rate', 'PPh 23 Withheld'],
      ]

      let totalBase = 0
      let totalWithheld = 0

      pph23Data.forEach((item: any) => {
        rows.push([
          item.vendor_name,
          item.vendor_tax_id || '-',
          item.bill_number,
          item.bill_date,
          Number(item.base_amount),
          `${Number(item.pph23_rate) * 100}%`,
          Number(item.pph23_withheld),
        ])
        totalBase += Number(item.base_amount)
        totalWithheld += Number(item.pph23_withheld)
      })

      rows.push([])
      rows.push(['TOTAL', '', '', '', totalBase, '', totalWithheld])

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'PPh 23')
      XLSX.writeFile(wb, `PPh23_${period}.xlsx`)
    } else if (reportType === 'ppn' && ppnData) {
      const rows = [
        ['EPILOG CREATIVE'],
        ['PPN (VAT) MONTHLY REPORT'],
        [`Period: ${period}`],
        [],
        ['Type', 'Document #', 'Date', 'Partner', 'NPWP', 'Faktur Pajak', 'Base Amount', 'PPN Amount'],
      ]

      let totalBase = 0
      let totalVAT = 0

      ppnData.forEach((item: any) => {
        rows.push([
          item.transaction_type,
          item.document_number,
          item.document_date,
          item.partner_name,
          item.partner_tax_id || '-',
          item.faktur_pajak || '-',
          Number(item.base_amount),
          Number(item.ppn_amount),
        ])
        totalBase += Number(item.base_amount)
        totalVAT += Number(item.ppn_amount)
      })

      rows.push([])
      rows.push(['TOTAL', '', '', '', '', '', totalBase, totalVAT])

      const ws = XLSX.utils.aoa_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'PPN')
      XLSX.writeFile(wb, `PPN_${period}.xlsx`)
    }
  }

  const data = reportType === 'pph23' ? pph23Data : ppnData

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Tax Filing Reports</h1>
        <button
          onClick={handleExportExcel}
          disabled={!data || data.length === 0}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg shadow p-4 mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'pph23' | 'ppn')}
            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
          >
            <option value="pph23">PPh 23 (Income Tax Withholding)</option>
            <option value="ppn">PPN (VAT)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">Period</label>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
          />
        </div>
      </div>

      {/* PPh 23 Report */}
      {reportType === 'pph23' && pph23Data && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border border-border text-foreground">Vendor</th>
                <th className="text-left p-3 border border-border text-foreground">NPWP</th>
                <th className="text-left p-3 border border-border text-foreground">Bill #</th>
                <th className="text-left p-3 border border-border text-foreground">Date</th>
                <th className="text-right p-3 border border-border text-foreground">Base Amount</th>
                <th className="text-center p-3 border border-border text-foreground">Rate</th>
                <th className="text-right p-3 border border-border text-foreground">Withheld</th>
              </tr>
            </thead>
            <tbody>
              {pph23Data.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-3 border border-border text-foreground">{item.vendor_name}</td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.vendor_tax_id || '-'}
                  </td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.bill_number}
                  </td>
                  <td className="p-3 border border-border text-foreground">
                    {new Date(item.bill_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border border-border text-right font-mono text-foreground">
                    {Number(item.base_amount).toLocaleString()}
                  </td>
                  <td className="p-3 border border-border text-center text-foreground">
                    {(Number(item.pph23_rate) * 100).toFixed(0)}%
                  </td>
                  <td className="p-3 border border-border text-right font-mono font-semibold text-foreground">
                    {Number(item.pph23_withheld).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td colSpan={4} className="p-3 border border-border text-right text-foreground">TOTAL</td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {pph23Data.reduce((sum: number, item: any) => sum + Number(item.base_amount), 0).toLocaleString()}
                </td>
                <td className="p-3 border border-border"></td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {pph23Data.reduce((sum: number, item: any) => sum + Number(item.pph23_withheld), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* PPN Report */}
      {reportType === 'ppn' && ppnData && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 border border-border text-foreground">Type</th>
                <th className="text-left p-3 border border-border text-foreground">Document #</th>
                <th className="text-left p-3 border border-border text-foreground">Date</th>
                <th className="text-left p-3 border border-border text-foreground">Partner</th>
                <th className="text-left p-3 border border-border text-foreground">NPWP</th>
                <th className="text-left p-3 border border-border text-foreground">Faktur Pajak</th>
                <th className="text-right p-3 border border-border text-foreground">Base</th>
                <th className="text-right p-3 border border-border text-foreground">PPN</th>
              </tr>
            </thead>
            <tbody>
              {ppnData.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-muted/50">
                  <td className="p-3 border border-border">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.transaction_type === 'SALES' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.transaction_type}
                    </span>
                  </td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.document_number}
                  </td>
                  <td className="p-3 border border-border text-foreground">
                    {new Date(item.document_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 border border-border text-foreground">{item.partner_name}</td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.partner_tax_id || '-'}
                  </td>
                  <td className="p-3 border border-border font-mono text-sm text-foreground">
                    {item.faktur_pajak || '-'}
                  </td>
                  <td className="p-3 border border-border text-right font-mono text-foreground">
                    {Number(item.base_amount).toLocaleString()}
                  </td>
                  <td className="p-3 border border-border text-right font-mono font-semibold text-foreground">
                    {Number(item.ppn_amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold">
                <td colSpan={6} className="p-3 border border-border text-right text-foreground">TOTAL</td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {ppnData.reduce((sum: number, item: any) => sum + Number(item.base_amount), 0).toLocaleString()}
                </td>
                <td className="p-3 border border-border text-right font-mono text-foreground">
                  {ppnData.reduce((sum: number, item: any) => sum + Number(item.ppn_amount), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
