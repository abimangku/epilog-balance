import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, TrendingUp, DollarSign } from 'lucide-react'

export function Dashboard() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Vibe Accounting - PSAK-Compliant for Epilog Creative</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">-</div>
            <p className="text-sm text-muted-foreground mt-2">Coming in Batch 7</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-destructive" />
              Total Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">-</div>
            <p className="text-sm text-muted-foreground mt-2">Coming in Batch 7</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Total Equity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">-</div>
            <p className="text-sm text-muted-foreground mt-2">Coming in Batch 7</p>
          </CardContent>
        </Card>
      </div>

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
