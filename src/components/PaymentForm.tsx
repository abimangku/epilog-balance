import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCreatePayment } from '@/hooks/usePayments'
import { useBill } from '@/hooks/useBills'
import { useToast } from '@/hooks/use-toast'

export function PaymentForm() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const billId = searchParams.get('bill') || ''

  const { data: bill } = useBill(billId)
  const createPayment = useCreatePayment()
  const { toast } = useToast()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [bankAccountCode, setBankAccountCode] = useState('1-10200')

  useEffect(() => {
    if (bill) {
      const totalPaid =
        bill.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount) + Number(p.pph23_withheld),
          0
        ) || 0
      const balance = Number(bill.total) - totalPaid
      
      const pph23 = bill.vendor?.subject_to_pph23
        ? Math.round(Number(bill.subtotal) * bill.vendor.pph23_rate)
        : 0
      const netPayment = balance - pph23
      
      setAmount(netPayment.toString())
    }
  }, [bill])

  if (!bill) {
    return <div className="p-6">Loading bill...</div>
  }

  const totalPaid =
    bill.payments?.reduce(
      (sum: number, p: any) => sum + Number(p.amount) + Number(p.pph23_withheld),
      0
    ) || 0
  const balance = Number(bill.total) - totalPaid

  const pph23 = bill.vendor?.subject_to_pph23
    ? Math.round(Number(bill.subtotal) * bill.vendor.pph23_rate)
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const netAmount = Number(amount)

    if (netAmount + pph23 > balance) {
      toast({
        title: "Validation Error",
        description: `Total payment (${(netAmount + pph23).toLocaleString()}) exceeds balance (${balance.toLocaleString()})`,
        variant: "destructive",
      })
      return
    }

    try {
      await createPayment.mutateAsync({
        date,
        billId: bill.id,
        amount: netAmount,
        bankAccountCode,
      })

      toast({
        title: "Success",
        description: "Payment recorded successfully!",
      })
      navigate('/bills')
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create payment',
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Pay Vendor Bill</h1>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Bill:</span> {bill.number}
          </div>
          <div>
            <span className="font-medium">Vendor:</span> {bill.vendor?.name}
          </div>
          <div>
            <span className="font-medium">Category:</span> {bill.category}
          </div>
          <div>
            <span className="font-medium">Total:</span> IDR {Number(bill.total).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Paid:</span> IDR {totalPaid.toLocaleString()}
          </div>
          <div className="col-span-2">
            <span className="font-medium text-lg">Balance Due:</span>{' '}
            <span className="text-lg font-bold text-blue-600">
              IDR {balance.toLocaleString()}
            </span>
          </div>
          {bill.vendor?.subject_to_pph23 && (
            <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded p-2">
              <span className="text-sm font-medium">⚠️ PPh 23 Withholding:</span>
              <div className="text-sm mt-1">
                This is a jasa vendor. {(bill.vendor.pph23_rate * 100).toFixed(0)}% PPh 23 
                (IDR {pph23.toLocaleString()}) will be automatically withheld from payment.
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payment Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bank Account *</label>
          <select
            value={bankAccountCode}
            onChange={(e) => setBankAccountCode(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="1-10200">Bank BSI</option>
            <option value="1-10300">Bank BRI</option>
            <option value="1-10400">Giro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Amount to Pay (net to vendor) *
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded px-3 py-2"
            min="0"
            max={balance - pph23}
            required
          />
        </div>

        <div className="bg-gray-50 border rounded p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Net payment to vendor:</span>
              <span className="font-mono">{Number(amount || 0).toLocaleString()}</span>
            </div>
            {pph23 > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>PPh 23 withheld ({(bill.vendor.pph23_rate * 100).toFixed(0)}%):</span>
                <span className="font-mono">+ {pph23.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total payment applied:</span>
              <span className="font-mono">
                {(Number(amount || 0) + pph23).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createPayment.isPending || !amount}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {createPayment.isPending ? 'Processing...' : 'Record Payment'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/bills')}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
