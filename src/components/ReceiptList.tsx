import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ReceiptList() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_receipt')
        .select(`
          *,
          client:client_id(name),
          invoice:invoice_id(number)
        `)
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
  })

  const filtered = receipts?.filter((r) =>
    r.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.invoice?.number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cash Receipts</h1>
        <Button asChild>
          <Link to="/receipt/new">
            <Plus className="mr-2 h-4 w-4" />
            New Receipt
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt #, client, or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Receipt #</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((receipt) => (
                  <tr key={receipt.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{receipt.number}</td>
                    <td className="py-3 px-4">{new Date(receipt.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{receipt.client?.name}</td>
                    <td className="py-3 px-4">
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link to={`/invoices/${receipt.invoice_id}`}>
                          {receipt.invoice?.number}
                        </Link>
                      </Button>
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(receipt.amount)}</td>
                    <td className="py-3 px-4">
                      <Button variant="link" className="h-auto p-0">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No receipts found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
