import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import * as XLSX from 'xlsx'

interface GLRow {
  accountCode: string
  accountName: string
  date: string
  transactionType: string
  transactionNumber: string
  description: string
  debit: number
  credit: number
}

interface TransactionGroup {
  number: string
  date: string
  type: string
  description: string
  lines: Array<{
    accountCode: string
    debit: number
    credit: number
    description: string
  }>
}

export function ImportGeneralLedger() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GLRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ 
    success: number
    failed: number
    errors: any[]
    projectsCreated: number
  } | null>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const mapped = jsonData
        .filter((row) => row['Transaction Type'] && row['Transaction Type'] !== 'Saldo Awal')
        .map((row) => ({
          accountCode: row['Account Code'] || '',
          accountName: row['Account Name'] || '',
          date: row['Date'] || '',
          transactionType: row['Transaction Type'] || '',
          transactionNumber: row['Transaction Number'] || '',
          description: row['Description'] || '',
          debit: parseFloat(row['Debit'] || '0'),
          credit: parseFloat(row['Credit'] || '0'),
        }))
        .filter((row) => row.accountCode && row.transactionNumber)

      setPreview(mapped.slice(0, 10))
      toast({
        title: 'File loaded',
        description: `Found ${mapped.length} transaction lines. Showing first 10 for preview.`,
      })
    } catch (error: any) {
      toast({
        title: 'Error reading file',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const detectAndCreateProjects = async (transactions: TransactionGroup[]) => {
    const projectPatterns = [
      /project\s+([a-zA-Z0-9\s\-]+)/i,
      /proyek\s+([a-zA-Z0-9\s\-]+)/i,
      /\[([a-zA-Z0-9\s\-]+)\]/,
    ]

    const detectedProjects = new Set<string>()

    transactions.forEach((tx) => {
      const desc = tx.description
      projectPatterns.forEach((pattern) => {
        const match = desc.match(pattern)
        if (match && match[1]) {
          detectedProjects.add(match[1].trim())
        }
      })
      
      tx.lines.forEach((line) => {
        projectPatterns.forEach((pattern) => {
          const match = line.description.match(pattern)
          if (match && match[1]) {
            detectedProjects.add(match[1].trim())
          }
        })
      })
    })

    const { count } = await supabase
      .from('project')
      .select('*', { count: 'exact', head: true })

    let projectsCreated = 0
    const projectCodes: Record<string, string> = {}

    for (const [index, projectName] of Array.from(detectedProjects).entries()) {
      const code = `PROJ-${String((count || 0) + index + 1).padStart(4, '0')}`
      
      const { error } = await supabase
        .from('project')
        .insert({
          code,
          name: projectName,
          status: 'ACTIVE',
          is_active: true,
        })

      if (!error) {
        projectsCreated++
        projectCodes[projectName] = code
      }
    }

    return { projectsCreated, projectCodes }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(0)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const glLines = jsonData
        .filter((row) => row['Transaction Type'] && row['Transaction Type'] !== 'Saldo Awal')
        .map((row) => ({
          accountCode: row['Account Code'] || '',
          accountName: row['Account Name'] || '',
          date: row['Date'] || '',
          transactionType: row['Transaction Type'] || '',
          transactionNumber: row['Transaction Number'] || '',
          description: row['Description'] || '',
          debit: parseFloat(row['Debit'] || '0'),
          credit: parseFloat(row['Credit'] || '0'),
        }))
        .filter((row) => row.accountCode && row.transactionNumber)

      // Group by transaction number
      const groupedTransactions = new Map<string, TransactionGroup>()
      
      glLines.forEach((line) => {
        if (!groupedTransactions.has(line.transactionNumber)) {
          groupedTransactions.set(line.transactionNumber, {
            number: line.transactionNumber,
            date: line.date,
            type: line.transactionType,
            description: line.description,
            lines: [],
          })
        }
        
        const group = groupedTransactions.get(line.transactionNumber)!
        group.lines.push({
          accountCode: line.accountCode,
          debit: line.debit,
          credit: line.credit,
          description: line.description,
        })
      })

      const transactions = Array.from(groupedTransactions.values())

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create import log
      const { data: importLogData, error: logError } = await supabase
        .from('import_log')
        .insert({
          import_type: 'general_ledger',
          file_name: file.name,
          file_size: file.size,
          records_total: transactions.length,
          records_success: 0,
          records_failed: 0,
          error_details: [],
          imported_by: user.id,
        })
        .select()
        .single()

      if (logError) throw logError

      // Detect and create projects
      const { projectsCreated, projectCodes } = await detectAndCreateProjects(transactions)

      let successCount = 0
      let failedCount = 0
      const errors: any[] = []

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i]
        
        try {
          // Validate balance
          const totalDebit = tx.lines.reduce((sum, line) => sum + line.debit, 0)
          const totalCredit = tx.lines.reduce((sum, line) => sum + line.credit, 0)
          
          if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Unbalanced entry: DR ${totalDebit} != CR ${totalCredit}`)
          }

          // Parse date
          const dateStr = tx.date
          let journalDate: string
          
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/')
            journalDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          } else {
            journalDate = dateStr
          }

          const period = journalDate.slice(0, 7)

          // Create journal entry
          const { data: journal, error: journalError } = await supabase
            .from('journal')
            .insert({
              number: tx.number,
              date: journalDate,
              description: tx.description,
              period,
              status: 'POSTED',
              created_by_ai: false,
              import_log_id: importLogData.id,
            })
            .select()
            .single()

          if (journalError) throw journalError

          // Detect project code from description
          let projectCode: string | null = null
          for (const [projectName, code] of Object.entries(projectCodes)) {
            if (tx.description.toLowerCase().includes(projectName.toLowerCase())) {
              projectCode = code
              break
            }
          }

          // Create journal lines
          const lines = tx.lines.map((line, idx) => ({
            journal_id: journal.id,
            account_code: line.accountCode,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
            project_code: projectCode,
            sort_order: idx,
          }))

          const { error: linesError } = await supabase
            .from('journal_line')
            .insert(lines)

          if (linesError) throw linesError

          successCount++
        } catch (error: any) {
          failedCount++
          errors.push({ 
            transaction: tx.number, 
            date: tx.date,
            error: error.message 
          })
        }

        setProgress(((i + 1) / transactions.length) * 100)
      }

      await supabase
        .from('import_log')
        .update({
          records_success: successCount,
          records_failed: failedCount,
          error_details: errors,
        })
        .eq('id', importLogData.id)

      setResult({ 
        success: successCount, 
        failed: failedCount, 
        errors,
        projectsCreated 
      })

      toast({
        title: 'Import complete',
        description: `Imported ${successCount} journals, created ${projectsCreated} projects. ${failedCount} failed.`,
      })
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import General Ledger Transactions</CardTitle>
        <CardDescription>
          Upload your 2025 General Ledger from Mekari Jurnal (excludes opening balances)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gl-file">Excel File</Label>
          <Input
            id="gl-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        {preview.length > 0 && !result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Preview (first 10 lines):</p>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Account</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Debit</th>
                        <th className="text-right p-2">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 text-xs">{row.accountCode}</td>
                          <td className="p-2 text-xs">{row.date}</td>
                          <td className="p-2 text-xs">{row.transactionType}</td>
                          <td className="p-2 text-right text-xs">{row.debit.toLocaleString()}</td>
                          <td className="p-2 text-right text-xs">{row.credit.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing journals... {Math.round(progress)}%
            </p>
          </div>
        )}

        {result && (
          <Alert variant={result.failed > 0 ? 'destructive' : 'default'}>
            {result.failed > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Import Results:</p>
                <p>✓ Journal entries imported: {result.success}</p>
                <p>✓ Projects auto-created: {result.projectsCreated}</p>
                {result.failed > 0 && <p>✗ Failed: {result.failed}</p>}
                {result.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer">View errors</summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <div key={i}>
                          {err.transaction} ({err.date}): {err.error}
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <p>... and {result.errors.length - 10} more errors</p>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || importing || !!result}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import General Ledger
          </Button>
          {result && (
            <Button
              variant="outline"
              onClick={() => {
                setFile(null)
                setPreview([])
                setResult(null)
                setProgress(0)
              }}
            >
              Import Another File
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
