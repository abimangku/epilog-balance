import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useUpdateInvoiceStatus } from '@/hooks/useInvoices'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const updateStatus = useUpdateInvoiceStatus()
  const { toast } = useToast()

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_invoice')
        .select(`
          *,
          client:client_id(name, email, address),
          project:project_id(name),
          lines:invoice_line(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
  })

  const { data: receipts } = useQuery({
    queryKey: ['receipts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_receipt')
        .select('*')
        .eq('invoice_id', id)
        .order('date', { ascending: false })

      if (error) throw error
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!invoice) {
    return <div>Invoice not found</div>
  }

  const totalPaid = receipts?.reduce((sum, r) => sum + r.amount, 0) || 0
  const balance = invoice.total - totalPaid

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Invoice {invoice.number}</h1>
          <Badge variant={
            invoice.status === 'PAID' ? 'default' :
            invoice.status === 'PARTIAL' ? 'secondary' :
            invoice.status === 'OVERDUE' ? 'destructive' : 'outline'
          }>
            {invoice.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'DRAFT' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default">Send Invoice</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Invoice?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the invoice as SENT and notify the client.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    updateStatus.mutate({ id: invoice.id, status: 'SENT' }, {
                      onSuccess: () => {
                        toast({ title: 'Success', description: 'Invoice marked as SENT' })
                      }
                    })
                  }}>
                    Send
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {(invoice.status === 'SENT' || invoice.status === 'PARTIAL') && balance === 0 && (
            <Button onClick={() => {
              updateStatus.mutate({ id: invoice.id, status: 'PAID' }, {
                onSuccess: () => {
                  toast({ title: 'Success', description: 'Invoice marked as PAID' })
                }
              })
            }}>
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{new Date(invoice.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client:</span>
              <span>{invoice.client?.name}</span>
            </div>
            {invoice.project && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project:</span>
                <span>{invoice.project?.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (11%):</span>
              <span>{formatCurrency(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Balance:</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines?.map((line: any) => (
                <tr key={line.id} className="border-b">
                  <td className="py-2">{line.description}</td>
                  <td className="text-right py-2">{line.quantity}</td>
                  <td className="text-right py-2">{formatCurrency(line.unit_price)}</td>
                  <td className="text-right py-2">{formatCurrency(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {receipts && receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Receipt #</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b">
                    <td className="py-2">{receipt.number}</td>
                    <td className="py-2">{new Date(receipt.date).toLocaleDateString()}</td>
                    <td className="text-right py-2">{formatCurrency(receipt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
