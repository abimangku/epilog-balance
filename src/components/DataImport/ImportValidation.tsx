import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function ImportValidation() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['import-validation'],
    queryFn: async () => {
      // Get accounts count
      const { count: accountsCount } = await supabase
        .from('account')
        .select('*', { count: 'exact', head: true })

      // Get clients count
      const { count: clientsCount } = await supabase
        .from('client')
        .select('*', { count: 'exact', head: true })

      // Get projects count
      const { count: projectsCount } = await supabase
        .from('project')
        .select('*', { count: 'exact', head: true })

      // Get 2025 journals count
      const { count: journalsCount } = await supabase
        .from('journal')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2025-01-01')
        .lte('date', '2025-12-31')

      // Get total debits and credits
      const { data: balances } = await supabase
        .from('journal_line')
        .select('debit, credit')
        .gte('journal_id', '00000000-0000-0000-0000-000000000000')

      const totalDebit = balances?.reduce((sum, line) => sum + Number(line.debit), 0) || 0
      const totalCredit = balances?.reduce((sum, line) => sum + Number(line.credit), 0) || 0
      const isBalanced = Math.abs(totalDebit - totalCredit) < 1

      // Get period breakdown
      const { data: journals } = await supabase
        .from('journal')
        .select('period')
        .gte('date', '2025-01-01')
        .lte('date', '2025-12-31')

      const periodCounts = journals?.reduce((acc, j) => {
        acc[j.period] = (acc[j.period] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Get import logs
      const { data: imports } = await supabase
        .from('import_log')
        .select('*')
        .order('imported_at', { ascending: false })
        .limit(10)

      return {
        accountsCount,
        clientsCount,
        projectsCount,
        journalsCount,
        totalDebit,
        totalCredit,
        isBalanced,
        periodCounts,
        imports,
      }
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle>Import Validation Summary</CardTitle>
          <CardDescription>
            Verify your imported data is complete and balanced
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={stats.isBalanced ? 'default' : 'destructive'}>
            {stats.isBalanced ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {stats.isBalanced ? (
                <div>
                  <p className="font-semibold">✓ All journal entries are balanced!</p>
                  <p className="text-sm mt-1">
                    Total Debit: {stats.totalDebit.toLocaleString('id-ID')} = 
                    Total Credit: {stats.totalCredit.toLocaleString('id-ID')}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold">⚠ Journal entries are not balanced!</p>
                  <p className="text-sm mt-1">
                    Total Debit: {stats.totalDebit.toLocaleString('id-ID')} ≠ 
                    Total Credit: {stats.totalCredit.toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm">
                    Difference: {Math.abs(stats.totalDebit - stats.totalCredit).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Master Data Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Chart of Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.accountsCount}</div>
            <p className="text-xs text-muted-foreground">accounts imported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientsCount}</div>
            <p className="text-xs text-muted-foreground">clients imported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectsCount}</div>
            <p className="text-xs text-muted-foreground">projects detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">2025 Journals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.journalsCount}</div>
            <p className="text-xs text-muted-foreground">journal entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>2025 Period Breakdown</CardTitle>
          <CardDescription>Journal entries by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(stats.periodCounts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([period, count]) => (
                <div key={period} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">
                    {period}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>Last 10 import operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.imports?.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{imp.import_type}</Badge>
                    <span className="font-medium text-sm">{imp.file_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(imp.imported_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    ✓ {imp.records_success}
                  </div>
                  {imp.records_failed > 0 && (
                    <div className="text-sm font-medium text-red-600">
                      ✗ {imp.records_failed}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {stats.accountsCount === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠ No Chart of Accounts imported. Import COA first!
                </AlertDescription>
              </Alert>
            )}
            {stats.clientsCount === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠ No clients imported. Import customer data next.
                </AlertDescription>
              </Alert>
            )}
            {stats.journalsCount === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠ No journal entries for 2025. Import General Ledger data.
                </AlertDescription>
              </Alert>
            )}
            {stats.accountsCount > 0 && stats.clientsCount > 0 && stats.journalsCount > 0 && stats.isBalanced && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  ✓ All data imported successfully! You can now start using the accounting system.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
