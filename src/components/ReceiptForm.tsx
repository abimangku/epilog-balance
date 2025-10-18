import { useState } from 'react'
import { useOutstandingInvoices } from '@/hooks/useInvoices'
import { useCreateReceipt } from '@/hooks/useReceipts'
import { useAccounts } from '@/hooks/useAccounts'

export function ReceiptForm() {
  const { data: outstandingInvoices, isLoading } = useOutstandingInvoices()
  const { data: accounts } = useAccounts()
  const createReceipt = useCreateReceipt()

  const [invoiceId, setInvoiceId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [pph23Withheld, setPph23Withheld] = useState('')
  const [bankAccountCode, setBankAccountCode] = useState('1-10200') // BSI default
  const [description, setDescription] = useState('')

  const bankAccounts = accounts?.filter(a => 
    a.code.startsWith('1-10') && !['1-10100'].includes(a.code)
  ) || []

  const selectedInvoice = outstandingInvoices?.find(inv => inv.id === invoiceId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceId || !date || !amount || !bankAccountCode) {
      alert('Please fill in all required fields')
      return
    }

    const receiptAmount = parseInt(amount)
    const withheld = pph23Withheld ? parseInt(pph23Withheld) : 0

    if (selectedInvoice && receiptAmount > selectedInvoice.outstanding) {
      alert(`Amount cannot exceed outstanding balance of IDR ${selectedInvoice.outstanding.toLocaleString()}`)
      return
    }

    try {
      await createReceipt.mutateAsync({
        invoiceId,
        date,
        amount: receiptAmount,
        pph23Withheld: withheld,
        bankAccountCode,
        description: description || undefined,
      })

      alert('Receipt created successfully!')
      
      // Reset form
      setInvoiceId('')
      setAmount('')
      setPph23Withheld('')
      setDescription('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create receipt')
    }
  }

  if (isLoading) {
    return <div className="p-6">Loading outstanding invoices...</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Record Cash Receipt</h1>

      {outstandingInvoices?.length === 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
          <p className="text-green-800">✅ All invoices are fully paid!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Invoice *</label>
          <select
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select invoice...</option>
            {outstandingInvoices?.map((invoice: any) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number} - {invoice.client?.name} - IDR {invoice.outstanding.toLocaleString()} outstanding
                {invoice.daysOverdue > 0 && ` (${invoice.daysOverdue} days overdue)`}
              </option>
            ))}
          </select>
        </div>

        {selectedInvoice && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold mb-2">Invoice Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-mono">IDR {selectedInvoice.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="font-mono">IDR {selectedInvoice.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Outstanding:</span>
                <span className="font-mono">IDR {selectedInvoice.outstanding.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Receipt Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount Received *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="0"
            min="0"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Total amount before PPh 23 withholding (if any)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">PPh 23 Withheld (optional)</label>
          <input
            type="number"
            value={pph23Withheld}
            onChange={(e) => setPph23Withheld(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="0"
            min="0"
          />
          <p className="text-xs text-gray-500 mt-1">
            Amount withheld by client (usually 2% for services)
          </p>
        </div>

        {pph23Withheld && parseInt(pph23Withheld) > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              Net received: IDR {(parseInt(amount || '0') - parseInt(pph23Withheld)).toLocaleString()}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Bank Account *</label>
          <select
            value={bankAccountCode}
            onChange={(e) => setBankAccountCode(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.code}>
                {account.code} - {account.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Additional notes"
          />
        </div>

        <button
          type="submit"
          disabled={createReceipt.isPending || !invoiceId || !amount}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createReceipt.isPending ? 'Recording...' : 'Record Receipt'}
        </button>
      </form>
    </div>
  )
}
