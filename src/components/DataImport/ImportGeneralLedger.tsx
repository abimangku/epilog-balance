import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAccounts } from '@/hooks/useAccounts'
import type { AccountType } from '@/lib/types'
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
    accountsCreated: number
  } | null>(null)
  const [showMapping, setShowMapping] = useState(false)
  const [oldCodes, setOldCodes] = useState<Array<{code: string, name: string}>>([])
  const [codeMapping, setCodeMapping] = useState<Record<string, string>>({})
  const [autoCreateAccounts, setAutoCreateAccounts] = useState(true)
  const { toast } = useToast()
  const { data: accounts } = useAccounts()

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

      // Extract account code from "Nama Akun" column which has format "(CODE) Name"
      const extractAccountCode = (namaAkun: string): string => {
        const match = namaAkun?.match(/\(([^)]+)\)/)
        return match ? match[1] : ''
      }

      const mapped = jsonData
        .filter((row) => row['Transaksi'] && row['Transaksi'] !== 'Saldo Awal')
        .map((row) => ({
          accountCode: extractAccountCode(row['Nama Akun'] || ''),
          accountName: row['Nama Akun'] || '',
          date: row['Tanggal'] || '',
          transactionType: row['Transaksi'] || '',
          transactionNumber: row['Nomor'] || '',
          description: row['Keterangan'] || '',
          debit: parseFloat(String(row['Debit'] || '0').replace(/,/g, '')),
          credit: parseFloat(String(row['Kredit'] || '0').replace(/,/g, '')),
        }))
        .filter((row) => row.accountCode && row.transactionNumber)

      setPreview(mapped.slice(0, 10))
      
      // Extract unique account codes
      const uniqueCodes = new Map<string, string>()
      mapped.forEach(row => {
        if (!uniqueCodes.has(row.accountCode)) {
          uniqueCodes.set(row.accountCode, row.accountName)
        }
      })
      
      const oldCodesArray = Array.from(uniqueCodes.entries()).map(([code, name]) => ({
        code,
        name
      }))
      setOldCodes(oldCodesArray)
      setShowMapping(true)
      
      toast({
        title: 'File loaded',
        description: `Found ${mapped.length} lines with ${oldCodesArray.length} unique account codes. Please map old codes to new codes.`,
      })
    } catch (error: any) {
      toast({
        title: 'Error reading file',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const getAccountTypeFromCode = (code: string): AccountType => {
    const prefix = code.split('-')[0]
    switch(prefix) {
      case '1': return 'ASSET'
      case '2': return 'LIABILITY'
      case '3': return 'EQUITY'
      case '4': return 'REVENUE'
      case '5': return 'COGS'
      case '6': return 'OPEX'
      case '7': return 'OTHER_INCOME'
      case '8': return 'OTHER_EXPENSE'
      case '9': return 'TAX_EXPENSE'
      default: return 'OPEX'
    }
  }

  const autoCreateMissingAccounts = async (
    glLines: GLRow[], 
    importLogId: string
  ): Promise<number> => {
    // Extract unique account codes
    const uniqueAccounts = new Map<string, string>()
    glLines.forEach(line => {
      if (!uniqueAccounts.has(line.accountCode)) {
        // Extract account name without the code prefix
        const name = line.accountName.replace(/\([^)]+\)\s*/, '').trim()
        uniqueAccounts.set(line.accountCode, name)
      }
    })

    // Get existing account codes
    const { data: existingAccounts } = await supabase
      .from('account')
      .select('code')
    
    const existingCodes = new Set(existingAccounts?.map(a => a.code) || [])

    // Filter to only missing accounts
    const missingAccounts = Array.from(uniqueAccounts.entries())
      .filter(([code]) => !existingCodes.has(code))
      .map(([code, name]) => ({
        code,
        name,
        type: getAccountTypeFromCode(code),
        is_active: true,
        import_log_id: importLogId
      }))

    if (missingAccounts.length === 0) {
      return 0
    }

    // Batch insert missing accounts
    const { error } = await supabase
      .from('account')
      .insert(missingAccounts)

    if (error) {
      console.error('Error creating accounts:', error)
      throw new Error(`Failed to create ${missingAccounts.length} missing accounts: ${error.message}`)
    }

    return missingAccounts.length
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

      // Extract account code from "Nama Akun" column which has format "(CODE) Name"
      const extractAccountCode = (namaAkun: string): string => {
        const match = namaAkun?.match(/\(([^)]+)\)/)
        return match ? match[1] : ''
      }

      const glLines = jsonData
        .filter((row) => row['Transaksi'] && row['Transaksi'] !== 'Saldo Awal')
        .map((row) => ({
          accountCode: extractAccountCode(row['Nama Akun'] || ''),
          accountName: row['Nama Akun'] || '',
          date: row['Tanggal'] || '',
          transactionType: row['Transaksi'] || '',
          transactionNumber: row['Nomor'] || '',
          description: row['Keterangan'] || '',
          debit: parseFloat(String(row['Debit'] || '0').replace(/,/g, '')),
          credit: parseFloat(String(row['Kredit'] || '0').replace(/,/g, '')),
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

      // Auto-create missing accounts if enabled
      let accountsCreated = 0
      if (autoCreateAccounts) {
        accountsCreated = await autoCreateMissingAccounts(glLines, importLogData.id)
        if (accountsCreated > 0) {
          toast({
            title: 'Accounts created',
            description: `Auto-created ${accountsCreated} missing account codes`,
          })
        }
      }

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

          // Parse date from DD/MM/YYYY format
          const dateStr = tx.date
          let journalDate: string
          
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/')
            const day = parts[0].padStart(2, '0')
            const month = parts[1].padStart(2, '0')
            const year = parts[2]
            journalDate = `${year}-${month}-${day}`
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

          // Create journal lines with mapped codes
          const lines = tx.lines.map((line, idx) => ({
            journal_id: journal.id,
            account_code: codeMapping[line.accountCode] || line.accountCode,
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
        projectsCreated,
        accountsCreated
      })

      toast({
        title: 'Import complete',
        description: `Imported ${successCount} journals, created ${accountsCreated} accounts and ${projectsCreated} projects. ${failedCount} failed.`,
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

        {file && !result && (
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg border">
            <Checkbox 
              id="auto-create" 
              checked={autoCreateAccounts}
              onCheckedChange={(checked) => setAutoCreateAccounts(checked === true)}
            />
            <Label 
              htmlFor="auto-create" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Auto-create missing accounts from General Ledger
              <span className="block text-xs text-muted-foreground font-normal mt-1">
                Automatically create account codes that don't exist in your current COA
              </span>
            </Label>
          </div>
        )}

        {showMapping && oldCodes.length > 0 && !result && !autoCreateAccounts && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-lg mb-2">Map Account Codes</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your GL file uses different account codes. Please map each old code to a new code from your current Chart of Accounts.
                  </p>
                </div>
                
                <div className="max-h-96 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Old Code</th>
                        <th className="text-left p-3 font-semibold">Old Name</th>
                        <th className="text-center p-3 w-12"></th>
                        <th className="text-left p-3 font-semibold">New Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oldCodes.map((oldAccount) => (
                        <tr key={oldAccount.code} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-mono text-xs">{oldAccount.code}</td>
                          <td className="p-3 text-xs">{oldAccount.name}</td>
                          <td className="p-3 text-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                          </td>
                          <td className="p-3">
                            <Select
                              value={codeMapping[oldAccount.code] || ''}
                              onValueChange={(value) => {
                                setCodeMapping(prev => ({
                                  ...prev,
                                  [oldAccount.code]: value
                                }))
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select new code..." />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts?.map((account) => (
                                  <SelectItem key={account.code} value={account.code}>
                                    {account.code} - {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Mapped: {Object.keys(codeMapping).length} / {oldCodes.length}
                  </p>
                  {Object.keys(codeMapping).length === oldCodes.length && (
                    <p className="text-sm text-green-600 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      All codes mapped! Ready to import.
                    </p>
                  )}
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
                {result.accountsCreated > 0 && <p>✓ Accounts auto-created: {result.accountsCreated}</p>}
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
            disabled={!file || importing || !!result || (!autoCreateAccounts && Object.keys(codeMapping).length !== oldCodes.length)}
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
            setShowMapping(false)
            setOldCodes([])
            setCodeMapping({})
            setAutoCreateAccounts(true)
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
