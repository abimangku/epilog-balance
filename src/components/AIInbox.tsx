import { usePendingSuggestions, useAcceptSuggestion } from '@/hooks/useAIClassification'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

export function AIInbox() {
  const { data: suggestions, isLoading } = usePendingSuggestions()
  const acceptSuggestion = useAcceptSuggestion()

  if (isLoading) {
    return <div className="p-6">Loading pending suggestions...</div>
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">AI Inbox</h1>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg mb-2">✅ All caught up!</p>
            <p className="text-muted-foreground">No pending transactions to review.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleAccept = async (suggestionId: string) => {
    if (!confirm('Create journal entry from this suggestion?')) return

    try {
      await acceptSuggestion.mutateAsync(suggestionId)
      alert('Journal entry created successfully!')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to accept suggestion')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AI Inbox</h1>
      <p className="text-muted-foreground mb-4">
        {suggestions.length} transaction{suggestions.length !== 1 ? 's' : ''} waiting for review
      </p>

      <div className="space-y-4">
        {suggestions.map((tx) => {
          const suggestion = tx.ai_suggestion
          if (!suggestion) return null

          const accounts = suggestion.suggested_accounts as Array<{
            code: string
            name: string
            debit: number
            credit: number
          }>

          const confidenceColor =
            suggestion.confidence > 0.9
              ? 'default'
              : suggestion.confidence > 0.7
              ? 'secondary'
              : 'destructive'

          return (
            <Card key={tx.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{tx.description}</CardTitle>
                    <p className="text-muted-foreground">
                      IDR {tx.amount.toLocaleString()}
                    </p>
                    {suggestion.suggested_vendor && (
                      <p className="text-sm text-muted-foreground">
                        Vendor: {suggestion.suggested_vendor}
                      </p>
                    )}
                    {suggestion.suggested_project && (
                      <p className="text-sm text-muted-foreground">
                        Project: {suggestion.suggested_project}
                      </p>
                    )}
                  </div>
                  <Badge variant={confidenceColor}>
                    {Math.round(suggestion.confidence * 100)}% confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Suggested Journal Entry:</p>
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-2 border-b">Account</th>
                          <th className="text-right p-2 border-b">Debit</th>
                          <th className="text-right p-2 border-b">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map((acc, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="p-2">
                              <span className="font-mono text-xs text-primary">
                                {acc.code}
                              </span>{' '}
                              {acc.name}
                            </td>
                            <td className="text-right p-2 font-mono">
                              {acc.debit > 0 ? acc.debit.toLocaleString() : '-'}
                            </td>
                            <td className="text-right p-2 font-mono">
                              {acc.credit > 0 ? acc.credit.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-semibold">
                          <td className="p-2">Total</td>
                          <td className="text-right p-2">
                            {accounts.reduce((sum, a) => sum + a.debit, 0).toLocaleString()}
                          </td>
                          <td className="text-right p-2">
                            {accounts.reduce((sum, a) => sum + a.credit, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {suggestion.reasoning && (
                  <div className="p-3 bg-muted rounded">
                    <p className="text-sm">
                      <span className="font-semibold">AI Reasoning:</span> {suggestion.reasoning}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAccept(suggestion.id)}
                    disabled={acceptSuggestion.isPending}
                    variant="default"
                  >
                    {acceptSuggestion.isPending ? 'Processing...' : '✓ Accept'}
                  </Button>
                  <Button variant="outline">✎ Edit</Button>
                  <Button variant="destructive">✕ Reject</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
