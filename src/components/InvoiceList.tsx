import { useState } from 'react'
import { useInvoices } from '@/hooks/useInvoices'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Search, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/exportToExcel'

export default function InvoiceList() {
  const { data: invoices, isLoading } = useInvoices()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filtered = invoices?.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter
    const matchesClient = clientFilter === 'all' || inv.client?.name === clientFilter
    const matchesDateRange = (!startDate || inv.date >= startDate) && (!endDate || inv.date <= endDate)
    return matchesSearch && matchesStatus && matchesClient && matchesDateRange
  })
  
  const uniqueClients = Array.from(new Set(invoices?.map(i => i.client?.name).filter(Boolean)))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'default'
      case 'SENT': return 'secondary'
      case 'PARTIAL': return 'outline'
      case 'OVERDUE': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleExport = () => {
    const exportData = filtered?.map(inv => ({
      'Invoice #': inv.number,
      'Client': inv.client?.name,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Due Date': new Date(inv.due_date).toLocaleDateString(),
      'Amount': inv.total,
      'Status': inv.status,
    })) || []
    
    exportToExcel(exportData, `invoices-${new Date().toISOString().split('T')[0]}`, 'Invoices')
  }

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
        <h1 className="text-3xl font-bold">Sales Invoices</h1>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button asChild>
            <Link to="/invoice/new">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Invoice #</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Due Date</th>
                  <th className="text-right py-3 px-4">Amount</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{invoice.number}</td>
                    <td className="py-3 px-4">{invoice.client?.name}</td>
                    <td className="py-3 px-4">{new Date(invoice.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{new Date(invoice.due_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(invoice.total)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={getStatusColor(invoice.status || 'DRAFT')}>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="link" asChild className="h-auto p-0">
                        <Link to={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
