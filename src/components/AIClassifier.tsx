import { useState } from 'react'
import { useClassifyTransaction } from '@/hooks/useAIClassification'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'

export function AIClassifier() {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [context, setContext] = useState('')

  const classify = useClassifyTransaction()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await classify.mutateAsync({
        description,
        amount: parseInt(amount),
        context: context || undefined,
      })

      alert(`Classification successful! Confidence: ${(result.suggestion.confidence * 100).toFixed(0)}%`)
      
      // Reset form
      setDescription('')
      setAmount('')
      setContext('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Classification failed')
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">AI Transaction Classifier</h1>

      <Card>
        <CardHeader>
          <CardTitle>Classify Transaction</CardTitle>
          <CardDescription>
            Let AI automatically classify your transaction into the correct accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Transaction Description *</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Meta Ads campaign - BSI December"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific! Include vendor, project, and what was purchased.
              </p>
            </div>

            <div>
              <Label htmlFor="amount">Amount (IDR) *</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="14000000"
                min="0"
                required
              />
            </div>

            <div>
              <Label htmlFor="context">Additional Context (optional)</Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., Vendor invoice, Client payment, Bank statement entry"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              disabled={classify.isPending}
              className="w-full"
            >
              {classify.isPending ? 'Classifying...' : '🤖 Classify with AI'}
            </Button>

            {classify.isSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="font-semibold text-green-800 mb-2">
                  ✅ Classification Complete
                </div>
                <div className="text-sm text-green-700">
                  Confidence: {(classify.data.suggestion.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-green-700">
                  Check the AI Inbox to review and approve.
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 Examples for Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            <li>• "Meta Ads campaign - BSI December" → Should classify as COGS Media</li>
            <li>• "Gaji Karyawan Januari 2025" → Should classify as Opex Salary</li>
            <li>• "Avicenna Shooting - talent & studio" → Should classify as COGS Production</li>
            <li>• "Transfer fee" → Should classify as Opex Bank Charges</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
