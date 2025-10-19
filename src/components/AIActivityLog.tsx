import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAISuggestions } from '@/hooks/useAISuggestions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight, ExternalLink, Search } from 'lucide-react'
import { format } from 'date-fns'

export function AIActivityLog() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [suggestionType, setSuggestionType] = useState('all')
  const [status, setStatus] = useState('all')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { data: suggestions, isLoading } = useAISuggestions({
    startDate,
    endDate,
    suggestionType,
    status,
  })

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-500/10 text-green-700 dark:text-green-300'
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
      case 'rejected': return 'bg-red-500/10 text-red-700 dark:text-red-300'
      default: return 'bg-secondary'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'journal': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
      case 'invoice': return 'bg-green-500/10 text-green-700 dark:text-green-300'
      case 'bill': return 'bg-red-500/10 text-red-700 dark:text-red-300'
      case 'payment': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
      default: return 'bg-secondary'
    }
  }

  const getDetailRoute = (type: string, entityId: string | null) => {
    if (!entityId) return null
    switch (type.toLowerCase()) {
      case 'journal': return `/journals/${entityId}`
      case 'invoice': return `/invoices/${entityId}`
      case 'bill': return `/bills/${entityId}`
      case 'payment': return `/bills` // Payments don't have detail pages
      default: return null
    }
  }

  const formatSuggestedData = (data: any) => {
    if (!data) return 'No data'
    return JSON.stringify(data, null, 2)
  }

  if (isLoading) {
    return <div className="p-8">Loading AI activity...</div>
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Activity Log</h1>
        <p className="text-muted-foreground mt-1">
          Track what the AI suggested and what was approved
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <Select value={suggestionType} onValueChange={setSuggestionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="bill">Bill</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
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
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Entry</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suggestions && suggestions.length > 0 ? (
              suggestions.map((suggestion) => {
                const isExpanded = expandedRows.has(suggestion.id)
                const detailRoute = getDetailRoute(suggestion.suggestion_type, suggestion.created_entity_id)
                
                return (
                  <>
                    <TableRow key={suggestion.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRow(suggestion.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {format(new Date(suggestion.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(suggestion.suggestion_type)}>
                          {suggestion.suggestion_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(suggestion.status)}>
                          {suggestion.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {suggestion.created_entity_type && suggestion.created_entity_id ? (
                          <span className="text-sm font-mono">
                            {suggestion.created_entity_type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not created</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {detailRoute && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={detailRoute}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/50">
                          <div className="p-4 space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">What AI Suggested:</h4>
                              <pre className="bg-background p-3 rounded-lg text-xs overflow-auto max-h-64">
                                {formatSuggestedData(suggestion.suggested_data)}
                              </pre>
                            </div>
                            {suggestion.approved_data && (
                              <div>
                                <h4 className="font-semibold mb-2">What Was Approved:</h4>
                                <pre className="bg-background p-3 rounded-lg text-xs overflow-auto max-h-64">
                                  {formatSuggestedData(suggestion.approved_data)}
                                </pre>
                              </div>
                            )}
                            {suggestion.approved_at && (
                              <div className="text-sm text-muted-foreground">
                                Approved at: {format(new Date(suggestion.approved_at), 'dd MMM yyyy HH:mm')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No AI activity found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {suggestions.length} AI suggestion{suggestions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
