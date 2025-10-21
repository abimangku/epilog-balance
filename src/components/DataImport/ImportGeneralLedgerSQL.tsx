import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import * as XLSX from 'xlsx'
import type { AccountType } from '@/lib/types'

interface GLRow {
  accountCode: string
  accountName: string
  date: string
  transactionType: string
  number: string
  description: string
  debit: number
  credit: number
}

export function ImportGeneralLedgerSQL() {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{
    accountsCreated: number
    projectsCreated: number
    journalsCreated: number
    linesCreated: number
  } | null>(null)

  const getAccountTypeFromCode = (code: string): AccountType => {
    const prefix = code.split('-')[0]
    const mapping: Record<string, AccountType> = {
      '1': 'ASSET',
      '2': 'LIABILITY',
      '3': 'EQUITY',
      '4': 'REVENUE',
      '5': 'COGS',
      '6': 'OPEX',
      '7': 'OTHER_INCOME',
      '8': 'OTHER_EXPENSE',
      '9': 'TAX_EXPENSE',
    }
    return mapping[prefix] || 'OPEX'
  }

  const parseDate = (dateStr: string): string => {
    // Parse DD/MM/YYYY format
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setIsImporting(true)

    try {
      // Read Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 0 })

      // Parse GL rows
      const glRows: GLRow[] = []
      for (const row of jsonData as any[]) {
        const accountField = row['Nama Akun'] || ''
        const match = accountField.match(/\(([^)]+)\)\s*(.*)/)
        
        if (!match || !row['Nomor']) continue // Skip opening balance and invalid rows

        const accountCode = match[1].trim()
        const accountName = match[2].trim()
        const debit = parseFloat(row['Debit'] || '0')
        const credit = parseFloat(row['Kredit'] || '0')

        glRows.push({
          accountCode,
          accountName,
          date: row['Tanggal'],
          transactionType: row['Transaksi'] || '',
          number: row['Nomor'].toString(),
          description: row['Keterangan'] || '',
          debit,
          credit,
        })
      }

      console.log(`Parsed ${glRows.length} GL rows`)

      // Get existing accounts and projects
      const { data: existingAccounts } = await supabase
        .from('account')
        .select('code, name')
      
      const { data: existingProjects } = await supabase
        .from('project')
        .select('code, name')

      const existingAccountCodes = new Set(existingAccounts?.map(a => a.code) || [])
      const existingProjectNames = new Set(existingProjects?.map(p => p.name) || [])

      // Extract unique accounts
      const accountsMap = new Map<string, { code: string; name: string; type: AccountType }>()
      for (const row of glRows) {
        if (!existingAccountCodes.has(row.accountCode)) {
          accountsMap.set(row.accountCode, {
            code: row.accountCode,
            name: row.accountName,
            type: getAccountTypeFromCode(row.accountCode),
          })
        }
      }

      // Extract unique projects from descriptions
      const projectsSet = new Set<string>()
      const projectKeywords = ['Project', 'Campaign', 'Shoot', 'Shooting', 'Production']
      for (const row of glRows) {
        for (const keyword of projectKeywords) {
          if (row.description.includes(keyword)) {
            const words = row.description.split(/[-\s]+/)
            const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.toLowerCase()))
            if (keywordIndex >= 0 && keywordIndex < words.length - 1) {
              const projectName = words.slice(keywordIndex, keywordIndex + 3).join(' ')
              if (!existingProjectNames.has(projectName)) {
                projectsSet.add(projectName)
              }
            }
          }
        }
      }

      console.log(`Found ${accountsMap.size} new accounts, ${projectsSet.size} new projects`)

      // Create import log
      const { data: importLog, error: logError } = await supabase
        .from('import_log')
        .insert({
          import_type: 'general_ledger_sql',
          file_name: file.name,
          file_size: file.size,
          records_total: glRows.length,
          records_success: 0,
          records_failed: 0,
        })
        .select()
        .single()

      if (logError) throw logError

      let accountsCreated = 0
      let projectsCreated = 0

      // Insert missing accounts
      if (accountsMap.size > 0) {
        const accountsToInsert = Array.from(accountsMap.values()).map(acc => ({
          code: acc.code,
          name: acc.name,
          type: acc.type,
          is_active: true,
          import_log_id: importLog.id,
        }))

        const { error: accountError } = await supabase
          .from('account')
          .insert(accountsToInsert)

        if (accountError) {
          console.error('Error creating accounts:', accountError)
        } else {
          accountsCreated = accountsToInsert.length
        }
      }

      // Insert missing projects
      if (projectsSet.size > 0) {
        let projectCode = 1000
        const projectsToInsert = Array.from(projectsSet).map(name => ({
          code: `PROJ-${String(projectCode++).padStart(4, '0')}`,
          name,
          status: 'ACTIVE' as const,
          is_active: true,
        }))

        const { error: projectError } = await supabase
          .from('project')
          .insert(projectsToInsert)

        if (projectError) {
          console.error('Error creating projects:', projectError)
        } else {
          projectsCreated = projectsToInsert.length
        }
      }

      // Group transactions by number
      const transactionGroups = new Map<string, GLRow[]>()
      for (const row of glRows) {
        if (!transactionGroups.has(row.number)) {
          transactionGroups.set(row.number, [])
        }
        transactionGroups.get(row.number)!.push(row)
      }

      console.log(`Processing ${transactionGroups.size} transaction groups`)

      let journalsCreated = 0
      let linesCreated = 0

      // Insert journals and lines in batches
      for (const [number, lines] of transactionGroups) {
        const firstLine = lines[0]
        const date = parseDate(firstLine.date)
        const period = date.substring(0, 7) // YYYY-MM

        // Create journal
        const { data: journal, error: journalError } = await supabase
          .from('journal')
          .insert({
            number: `JRN-GL-${number}`,
            date,
            period,
            description: firstLine.description,
            status: 'POSTED',
            import_log_id: importLog.id,
          })
          .select()
          .single()

        if (journalError) {
          console.error(`Error creating journal ${number}:`, journalError)
          continue
        }

        journalsCreated++

        // Create journal lines
        const journalLines = lines.map((line, index) => ({
          journal_id: journal.id,
          account_code: line.accountCode,
          description: line.description,
          debit: Math.round(line.debit),
          credit: Math.round(line.credit),
          sort_order: index,
        }))

        const { error: lineError } = await supabase
          .from('journal_line')
          .insert(journalLines)

        if (lineError) {
          console.error(`Error creating lines for journal ${number}:`, lineError)
        } else {
          linesCreated += journalLines.length
        }
      }

      // Update import log
      await supabase
        .from('import_log')
        .update({
          records_success: journalsCreated,
          records_failed: transactionGroups.size - journalsCreated,
        })
        .eq('id', importLog.id)

      setResult({
        accountsCreated,
        projectsCreated,
        journalsCreated,
        linesCreated,
      })

      toast.success(`Import completed! Created ${journalsCreated} journals with ${linesCreated} lines`)
    } catch (error) {
      console.error('Import error:', error)
      toast.error(`Import failed: ${error.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Ledger Import (Direct SQL)</CardTitle>
        <CardDescription>
          Upload your General Ledger Excel file. This will directly create all accounts, projects, and journal entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="flex-1"
                  id="gl-file-upload"
                />
                <label htmlFor="gl-file-upload" className="sr-only">
                  Upload Excel File
                </label>
              </div>

              {file && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    File loaded: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!file || isImporting}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import General Ledger'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div><strong>Import Completed Successfully!</strong></div>
                  <div>• Accounts created: {result.accountsCreated}</div>
                  <div>• Projects created: {result.projectsCreated}</div>
                  <div>• Journals created: {result.journalsCreated}</div>
                  <div>• Journal lines created: {result.linesCreated}</div>
                </div>
              </AlertDescription>
            </Alert>

            <Button onClick={handleReset} variant="outline" className="w-full">
              Import Another File
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
