import { useParams, Link, useNavigate } from 'react-router-dom'
import { useBill, useUpdateBillStatus } from '@/hooks/useBills'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Building, Calendar } from 'lucide-react'

export function BillDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: bill, isLoading } = useBill(id!)
  const updateStatus = useUpdateBillStatus()
  const navigate = useNavigate()
  const { toast } = useToast()

  if (isLoading) return <div className="p-6">Loading bill...</div>
  if (!bill) return <div className="p-6">Bill not found</div>

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    APPROVED: 'bg-blue-100 text-blue-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
  }

  const totalPaid = bill.payments?.reduce((sum: number, p: any) => 
    sum + Number(p.amount) + Number(p.pph23_withheld || 0), 0
  ) || 0
  const balance = Number(bill.total) - totalPaid

  const handleApproveBill = async () => {
    try {
      await updateStatus.mutateAsync({ id: bill.id, status: 'APPROVED' })
      toast({ title: 'Bill Approved', description: 'Bill status updated to APPROVED' })
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to approve bill',
        variant: 'destructive' 
      })
    }
  }

  const handleMarkAsPaid = async () => {
    if (balance > 0) {
      toast({ 
        title: 'Cannot Mark as Paid', 
        description: 'Bill still has outstanding balance',
        variant: 'destructive' 
      })
      return
    }
    
    try {
      await updateStatus.mutateAsync({ id: bill.id, status: 'PAID' })
      toast({ title: 'Bill Marked as Paid', description: 'Bill status updated to PAID' })
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive' 
      })
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/bills')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{bill.number}</h1>
            <p className="text-muted-foreground">Vendor Bill Details</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {bill.status === 'DRAFT' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>Approve Bill</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve Bill?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the bill as APPROVED and create the accounting journal entry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleApproveBill}>
                    Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {(bill.status === 'APPROVED' || bill.status === 'PARTIAL') && balance === 0 && (
            <Button onClick={handleMarkAsPaid}>Mark as Paid</Button>
          )}
          
          {(bill.status === 'APPROVED' || bill.status === 'PARTIAL') && balance > 0 && (
            <Link to={`/payments/new?bill=${bill.id}`}>
              <Button>Pay Vendor</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Bill Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle>Bill Information</CardTitle>
            <Badge className={statusColors[bill.status]}>{bill.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">Vendor</div>
                  <div className="font-medium">{bill.vendor?.name}</div>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">Date / Due Date</div>
                  <div className="font-medium">
                    {new Date(bill.date).toLocaleDateString()} / {new Date(bill.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Vendor Invoice #</div>
                <div className="font-medium">{bill.vendor_invoice_number || '-'}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Faktur Pajak #</div>
                <div className="font-medium">{bill.faktur_pajak_number || '-'}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Category</div>
                <Badge variant="outline">{bill.category}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Expense Account</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.lines?.map((line: any) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>
                    <code className="text-sm">{line.expense_account_code}</code>
                  </TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    {Number(line.unit_price).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {Number(line.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 space-y-2 text-right">
            <div className="flex justify-end gap-4">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-mono w-32">{Number(bill.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-4">
              <span className="text-muted-foreground">VAT (11%):</span>
              <span className="font-mono w-32">{Number(bill.vat_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-end gap-4 text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="font-mono w-32">IDR {Number(bill.total).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payments</CardTitle>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Remaining Balance</div>
              <div className={`text-2xl font-bold ${balance === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                IDR {balance.toLocaleString()}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bill.payments && bill.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">PPh 23</TableHead>
                  <TableHead className="text-right">Total Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{payment.number}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(payment.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(payment.pph23_withheld || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {(Number(payment.amount) + Number(payment.pph23_withheld || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No payments recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
