import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCreateInvoice } from '@/hooks/useInvoices'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { useValidatePeriod } from '@/hooks/usePeriodClose'
import { useToast } from '@/hooks/use-toast'

interface InvoiceLine {
  description: string
  quantity: number
  unitPrice: number
  amount: number
  revenueAccountCode: string
}

export function InvoiceForm() {
  const { data: accounts } = useAccounts()
  const createInvoice = useCreateInvoice()
  const { toast } = useToast()

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data
    },
  })

  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unitPrice: 0, amount: 0, revenueAccountCode: '4-40100' },
  ])

  const revenueAccounts = accounts?.filter(a => a.type === 'REVENUE') || []
  
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const vatAmount = Math.round(subtotal * 0.11)
  const total = subtotal + vatAmount

  const period = date ? new Date(date).toISOString().slice(0, 7) : ''
  const { data: periodCheck } = useValidatePeriod(period)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientId || !date || !dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    if (periodCheck?.isClosed) {
      toast({
        title: 'Period Closed',
        description: 'Cannot create invoice in a closed period',
        variant: 'destructive'
      })
      return
    }

    try {
      await createInvoice.mutateAsync({
        clientId,
        projectId: projectId || undefined,
        date,
        dueDate,
        description,
        lines: lines.filter(line => line.description && line.amount > 0),
      })

      toast({
        title: 'Success',
        description: 'Invoice created successfully!',
      })
      
      // Reset form
      setClientId('')
      setProjectId('')
      setDescription('')
      setLines([{ description: '', quantity: 1, unitPrice: 0, amount: 0, revenueAccountCode: '4-40100' }])
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invoice',
        variant: 'destructive'
      })
    }
  }

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPrice: 0, amount: 0, revenueAccountCode: '4-40100' }])
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof InvoiceLine, value: any) => {
    const updated = [...lines]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-calculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].amount = updated[index].quantity * updated[index].unitPrice
    }
    
    setLines(updated)
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create Sales Invoice</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select client...</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.code} - {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Project (optional)</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">No project</option>
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} - {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Invoice description"
          />
        </div>

        <div className="border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Invoice Lines</h3>
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
                <th className="text-left p-2 border">Revenue Account</th>
                <th className="text-right p-2 border">Qty</th>
                <th className="text-right p-2 border">Unit Price</th>
                <th className="text-right p-2 border">Amount</th>
                <th className="p-2 border"></th>
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
                      placeholder="Service description"
                    />
                  </td>
                  <td className="p-2 border">
                    <select
                      value={line.revenueAccountCode}
                      onChange={(e) => updateLine(index, 'revenueAccountCode', e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm"
                    >
                      {revenueAccounts.map((account) => (
                        <option key={account.id} value={account.code}>
                          {account.code} - {account.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-sm text-right"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                      className="w-full border rounded px-2 py-1 text-sm text-right"
                      min="0"
                    />
                  </td>
                  <td className="p-2 border text-right font-mono text-sm">
                    {line.amount.toLocaleString()}
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

          <div className="mt-4 border-t pt-4 flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-1">
                <span className="text-sm">Subtotal:</span>
                <span className="font-mono text-sm">IDR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm">PPN 11%:</span>
                <span className="font-mono text-sm">IDR {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-t font-semibold">
                <span>Total:</span>
                <span className="font-mono">IDR {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={createInvoice.isPending || !clientId || !date || !dueDate}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
        </button>
      </form>
    </div>
  )
}
