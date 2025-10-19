import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { exportToExcel } from '@/lib/exportToExcel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Eye, Search } from 'lucide-react'
import { format } from 'date-fns'

export function TransactionsList() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [aiFilter, setAiFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { data: transactions, isLoading } = useTransactions({
    startDate,
    endDate,
    type,
    status,
    aiFilter,
    searchTerm,
  })

  const handleExport = () => {
    if (!transactions) return
    
    const exportData = transactions.map(t => ({
      Date: format(new Date(t.date), 'dd MMM yyyy'),
      Type: t.type.toUpperCase(),
      Number: t.number,
      Description: t.description,
      Amount: t.amount,
      Status: t.status,
      'Created By': t.created_by ? 'User' : 'System',
    }))
    
    exportToExcel(exportData, 'transactions', 'Transactions')
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'journal': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      case 'invoice': return 'bg-green-500/10 text-green-700 dark:text-green-300'
      case 'bill': return 'bg-red-500/10 text-red-700 dark:text-red-300'
      case 'payment': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
      case 'receipt': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
      default: return 'bg-secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'POSTED': return 'bg-primary/10 text-primary'
      case 'PAID': return 'bg-green-500/10 text-green-700 dark:text-green-300'
      case 'APPROVED': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      case 'DRAFT': return 'bg-muted text-muted-foreground'
      case 'SENT': return 'bg-orange-500/10 text-orange-700 dark:text-orange-300'
      case 'PARTIAL': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
      default: return 'bg-secondary'
    }
  }

  const getDetailRoute = (type: string, id: string) => {
    switch (type) {
      case 'journal': return `/journals/${id}`
      case 'invoice': return `/invoices/${id}`
      case 'bill': return `/bills/${id}`
      case 'payment': return `/bills` // Payments don't have detail pages yet
      case 'receipt': return `/receipts/${id}`
      default: return '#'
    }
  }

  if (isLoading) {
    return <div className="p-8">Loading transactions...</div>
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">All Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Unified view of all journals, invoices, bills, payments, and receipts
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="bill">Bill</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Source</label>
            <Select value={aiFilter} onValueChange={setAiFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="ai">🤖 AI Created</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Number, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions && transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={`${transaction.type}-${transaction.id}`}>
                  <TableCell>
                    {format(new Date(transaction.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(transaction.type)}>
                      {transaction.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.number}
                    {transaction.created_by_ai && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded font-medium">
                        🤖 AI
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {new Intl.NumberFormat('id-ID').format(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link to={getDetailRoute(transaction.type, transaction.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {transactions && transactions.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
