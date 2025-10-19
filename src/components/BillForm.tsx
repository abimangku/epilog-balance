import { useState } from 'react'
import { useCreateBill } from '@/hooks/useBills'
import { useVendors, useProjects } from '@/hooks/useVendors'
import { useAccounts } from '@/hooks/useAccounts'
import type { BillLine } from '@/hooks/useBills'
import { useToast } from '@/hooks/use-toast'
import { useValidatePeriod } from '@/hooks/usePeriodClose'

export function BillForm() {
  const { data: vendors } = useVendors()
  const { data: projects } = useProjects()
  const { data: accounts } = useAccounts()
  const createBill = useCreateBill()
  const { toast } = useToast()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [vendorId, setVendorId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [vendorInvoiceNumber, setVendorInvoiceNumber] = useState('')
  const [fakturPajakNumber, setFakturPajakNumber] = useState('')
  const [category, setCategory] = useState<'COGS' | 'OPEX'>('OPEX')
  const [lines, setLines] = useState<BillLine[]>([
    {
      description: '',
      quantity: 1,
      unitPrice: 0,
      expenseAccountCode: '6-60100',
    },
  ])

  const expenseAccounts = accounts?.filter(
    (acc) => acc.type === category
  ) || []

  const selectedVendor = vendors?.find(v => v.id === vendorId)

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const vatAmount = selectedVendor?.provides_faktur_pajak && fakturPajakNumber
    ? Math.round(subtotal * 0.11)
    : 0
  const total = subtotal + vatAmount

  const period = date ? new Date(date).toISOString().slice(0, 7) : ''
  const { data: periodCheck } = useValidatePeriod(period)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (category === 'COGS' && !projectId) {
      toast({
        title: "Validation Error",
        description: "COGS bills must have a project",
        variant: "destructive",
      })
      return
    }

    if (periodCheck?.isClosed) {
      toast({
        title: 'Period Closed',
        description: 'Cannot create bill in a closed period',
        variant: 'destructive'
      })
      return
    }

    try {
      await createBill.mutateAsync({
        date,
        vendorId,
        projectId: projectId || undefined,
        vendorInvoiceNumber: vendorInvoiceNumber || undefined,
        fakturPajakNumber: fakturPajakNumber || undefined,
        category,
        lines: lines.filter(line => line.description && line.unitPrice > 0),
      })

      toast({
        title: "Success",
        description: "Bill created successfully!",
      })
      
      setVendorId('')
      setProjectId('')
      setVendorInvoiceNumber('')
      setFakturPajakNumber('')
      setLines([{
        description: '',
        quantity: 1,
        unitPrice: 0,
        expenseAccountCode: category === 'COGS' ? '5-50100' : '6-60100',
      }])
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create bill',
        variant: "destructive",
      })
    }
  }

  const addLine = () => {
    setLines([
      ...lines,
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        expenseAccountCode: category === 'COGS' ? '5-50100' : '6-60100',
      },
    ])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof BillLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    setLines(updated)
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Create Vendor Bill</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vendor *</label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select vendor...</option>
              {vendors?.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                  {vendor.provides_faktur_pajak && ' (PKP)'}
                  {vendor.subject_to_pph23 && ' (PPh 23)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as 'COGS' | 'OPEX')
                setLines(lines.map(line => ({
                  ...line,
                  expenseAccountCode: e.target.value === 'COGS' ? '5-50100' : '6-60100'
                })))
              }}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="OPEX">Operating Expense (OPEX)</option>
              <option value="COGS">Cost of Goods Sold (COGS)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Project {category === 'COGS' && '*'}
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required={category === 'COGS'}
            >
              <option value="">Select project...</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Vendor Invoice Number
            </label>
            <input
              type="text"
              value={vendorInvoiceNumber}
              onChange={(e) => setVendorInvoiceNumber(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Vendor's invoice #"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Faktur Pajak Number
              {selectedVendor?.provides_faktur_pajak && ' (recommended)'}
            </label>
            <input
              type="text"
              value={fakturPajakNumber}
              onChange={(e) => setFakturPajakNumber(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="010.002-25.00100"
              disabled={!selectedVendor?.provides_faktur_pajak}
            />
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Line Items</h3>
            <button
              type="button"
              onClick={addLine}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add Line
            </button>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Description</th>
                <th className="text-left p-2 border w-24">Qty</th>
                <th className="text-right p-2 border w-32">Unit Price</th>
                <th className="text-left p-2 border w-48">Expense Account</th>
                <th className="text-right p-2 border w-32">Amount</th>
                <th className="p-2 border w-20"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td className="p-2 border">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(index, 'description', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                      placeholder="Expense description"
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={line.unitPrice || ''}
                      onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-sm text-right"
                      min="0"
                    />
                  </td>
                  <td className="p-2 border">
                    <select
                      value={line.expenseAccountCode}
                      onChange={(e) => updateLine(index, 'expenseAccountCode', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      {expenseAccounts.map((acc) => (
                        <option key={acc.id} value={acc.code}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border text-right font-mono text-sm">
                    {(line.quantity * line.unitPrice).toLocaleString()}
                  </td>
                  <td className="p-2 border text-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-mono">{subtotal.toLocaleString()}</span>
              </div>
              {vatAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>PPN Masukan (11%):</span>
                  <span className="font-mono">+ {vatAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="font-mono">IDR {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={createBill.isPending || !vendorId}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {createBill.isPending ? 'Creating...' : 'Create Bill'}
        </button>
      </form>
    </div>
  )
}
