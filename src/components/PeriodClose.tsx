import { useState } from 'react'
import { useRunAudit, useClosePeriod, usePeriodStatus, useVATPosition } from '@/hooks/usePeriodClose'
import { useToast } from '@/hooks/use-toast'

export function PeriodClose() {
  const [selectedPeriod, setSelectedPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  )
  const { toast } = useToast()

  const { data: periodStatus } = usePeriodStatus(selectedPeriod)
  const { data: vatPosition } = useVATPosition(selectedPeriod)
  const runAudit = useRunAudit()
  const closePeriod = useClosePeriod()

  const [auditResult, setAuditResult] = useState<any>(null)

  const handleRunAudit = async () => {
    try {
      const result = await runAudit.mutateAsync(selectedPeriod)
      setAuditResult(result.result)
      toast({
        title: "Audit Complete",
        description: "AI LedgerQA audit finished successfully",
      })
    } catch (error) {
      toast({
        title: "Audit Failed",
        description: error instanceof Error ? error.message : 'Audit failed',
        variant: "destructive",
      })
    }
  }

  const handleClosePeriod = async () => {
    if (!auditResult) {
      toast({
        title: "Run Audit First",
        description: "Please run audit before closing the period",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Close period ${selectedPeriod}? This will lock all journals.`)) {
      return
    }

    try {
      await closePeriod.mutateAsync({
        period: selectedPeriod,
        auditId: runAudit.data?.auditId,
      })
      toast({
        title: "Period Closed",
        description: "Period closed successfully!",
      })
      setAuditResult(null)
    } catch (error) {
      toast({
        title: "Failed to Close",
        description: error instanceof Error ? error.message : 'Failed to close period',
        variant: "destructive",
      })
    }
  }

  const isClosed = periodStatus?.status === 'CLOSED'

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Period Close</h1>

      <div className="bg-card rounded shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Select Period</label>
        <input
          type="month"
          value={selectedPeriod}
          onChange={(e) => {
            setSelectedPeriod(e.target.value)
            setAuditResult(null)
          }}
          className="border rounded px-3 py-2"
          disabled={isClosed}
        />
        
        {isClosed && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <span className="text-green-800 font-medium">
              ✅ Period {selectedPeriod} is CLOSED
            </span>
            <div className="text-sm text-green-700 mt-1">
              Closed on {new Date(periodStatus.closed_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {vatPosition && (
        <div className="bg-card rounded shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">VAT Position</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">PPN Keluaran (Output)</div>
              <div className="text-2xl font-bold text-red-600">
                {Number(vatPosition.ppn_keluaran).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">PPN Masukan (Input)</div>
              <div className="text-2xl font-bold text-green-600">
                - {Number(vatPosition.ppn_masukan).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Net VAT Payable</div>
              <div className="text-2xl font-bold text-blue-600">
                {Number(vatPosition.net_payable).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card rounded shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">AI LedgerQA Audit</h2>
        
        {!auditResult && !isClosed && (
          <button
            onClick={handleRunAudit}
            disabled={runAudit.isPending}
            className="px-6 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {runAudit.isPending ? 'Running Audit...' : '🤖 Run AI Audit'}
          </button>
        )}

        {auditResult && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Period Health Score</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {auditResult.metrics.healthScore}/100
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Issues Found</div>
                  <div className="text-2xl font-bold">
                    {auditResult.metrics.issuesFound}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded">
              <h3 className="font-semibold mb-2">Executive Summary</h3>
              <p className="text-muted-foreground">{auditResult.summary}</p>
            </div>

            {auditResult.issues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Issues Detected</h3>
                <div className="space-y-2">
                  {auditResult.issues.map((issue: any, idx: number) => {
                    const severityColors: Record<string, string> = {
                      CRITICAL: 'bg-red-50 border-red-300 text-red-800',
                      HIGH: 'bg-orange-50 border-orange-300 text-orange-800',
                      MEDIUM: 'bg-yellow-50 border-yellow-300 text-yellow-800',
                      LOW: 'bg-blue-50 border-blue-300 text-blue-800',
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3 border rounded ${
                          severityColors[issue.severity] || ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">{issue.severity}</span>
                          <span className="text-sm font-mono">{issue.journalNumber}</span>
                        </div>
                        <p className="text-sm mb-1">{issue.message}</p>
                        {issue.suggestedFix && (
                          <p className="text-xs mt-2 italic">
                            💡 {issue.suggestedFix}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {auditResult.recommendations?.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-semibold mb-2">Recommendations</h3>
                <ul className="space-y-1">
                  {auditResult.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-green-800">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {auditResult.metrics.criticalIssues === 0 && !isClosed && (
              <button
                onClick={handleClosePeriod}
                disabled={closePeriod.isPending}
                className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {closePeriod.isPending ? 'Closing...' : '🔒 Close Period'}
              </button>
            )}

            {auditResult.metrics.criticalIssues > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium">
                  ⚠️ Cannot close period with {auditResult.metrics.criticalIssues} critical issue(s).
                  Please fix them first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
