import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, TrendingUp, DollarSign, AlertCircle, Users, TrendingDown } from 'lucide-react'
import { useDashboardMetrics } from '@/hooks/useCriticalFeatures'

export function Dashboard() {
  const { data: metrics, isLoading } = useDashboardMetrics()

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Vibe Accounting - PSAK-Compliant for Epilog Creative</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading metrics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Cash Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.cash_balance || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Bank accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  AR Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.ar_total || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Accounts receivable</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-destructive" />
                  AP Outstanding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.ap_total || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Accounts payable</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Overdue Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.overdue_invoices || 0) + Number((metrics as any)?.overdue_bills || 0)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(metrics as any)?.overdue_invoices || 0} invoices, {(metrics as any)?.overdue_bills || 0} bills
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  This Month Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.mtd_revenue || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Month-to-date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-destructive" />
                  This Month Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {Number((metrics as any)?.mtd_expenses || 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Month-to-date</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/accounts">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>View all 43 accounts</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link to="/journals/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Create Journal Entry
              </CardTitle>
              <CardDescription>Manual journal entry with DR/CR validation</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
