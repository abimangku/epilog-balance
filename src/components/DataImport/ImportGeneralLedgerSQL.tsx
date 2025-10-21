import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Upload, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  accountConflicts: Array<{
    code: string
    existingName: string
    newName: string
  }>
  stats: {
    totalRows: number
    validRows: number
    invalidRows: number
    uniqueAccounts: number
    uniqueProjects: number
    uniqueTransactions: number
  }
}

export function ImportGeneralLedgerSQL() {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
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
      setValidation(null)
    }
  }

  const validateImport = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setIsValidating(true)
    console.log('=== VALIDATION STARTED ===')

    try {
      // Read Excel file
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 0 })

      console.log(`Read ${jsonData.length} rows from Excel`)

      const errors: string[] = []
      const warnings: string[] = []
      const accountConflicts: Array<{ code: string; existingName: string; newName: string }> = []
      
      // Get existing accounts
      const { data: existingAccounts } = await supabase
        .from('account')
        .select('code, name')
      
      const existingAccountMap = new Map(existingAccounts?.map(a => [a.code, a.name]) || [])
      
      // Parse GL rows with validation
      const glRows: GLRow[] = []
      const accountsFound = new Set<string>()
      const projectsFound = new Set<string>()
      const transactionsFound = new Set<string>()
      let invalidRows = 0

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i] as any
        const rowNum = i + 2 // Excel row number

        // Validate required fields
        if (!row['Nama Akun']) {
          invalidRows++
          continue
        }

        const accountField = row['Nama Akun'] || ''
        const match = accountField.match(/\(([^)]+)\)\s*(.*)/)
        
        if (!match) {
          invalidRows++
          warnings.push(`Row ${rowNum}: Invalid account format "${accountField}"`)
          continue
        }

        if (!row['Nomor']) {
          invalidRows++
          continue // Skip opening balance rows
        }

        const accountCode = match[1].trim()
        const accountName = match[2].trim()

        // Check for account code conflicts
        if (existingAccountMap.has(accountCode)) {
          const existingName = existingAccountMap.get(accountCode)!
          if (existingName !== accountName) {
            if (!accountConflicts.some(c => c.code === accountCode)) {
              accountConflicts.push({
                code: accountCode,
                existingName,
                newName: accountName,
              })
            }
          }
        }

        // Validate date format
        if (!row['Tanggal'] || !row['Tanggal'].match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          errors.push(`Row ${rowNum}: Invalid date format "${row['Tanggal']}" (expected DD/MM/YYYY)`)
        }

        // Validate amounts
        const debit = parseFloat(row['Debit'] || '0')
        const credit = parseFloat(row['Kredit'] || '0')
        
        if (isNaN(debit) || isNaN(credit)) {
          errors.push(`Row ${rowNum}: Invalid debit/credit amounts`)
        }

        if (debit === 0 && credit === 0) {
          warnings.push(`Row ${rowNum}: Both debit and credit are zero`)
        }

        // Add to valid rows
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

        accountsFound.add(accountCode)
        transactionsFound.add(row['Nomor'].toString())
      }

      // Check for duplicate transaction numbers in existing journals
      const { data: existingJournals } = await supabase
        .from('journal')
        .select('number')
        .in('number', Array.from(transactionsFound).map(n => `JRN-GL-${n}`))

      if (existingJournals && existingJournals.length > 0) {
        warnings.push(`${existingJournals.length} journal numbers already exist and will be skipped`)
      }

      console.log(`Validation complete: ${glRows.length} valid rows, ${invalidRows} invalid rows`)
      console.log(`Found ${accountConflicts.length} account conflicts`)

      const validationResult: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        accountConflicts,
        stats: {
          totalRows: jsonData.length,
          validRows: glRows.length,
          invalidRows,
          uniqueAccounts: accountsFound.size,
          uniqueProjects: projectsFound.size,
          uniqueTransactions: transactionsFound.size,
        },
      }

      setValidation(validationResult)

      if (errors.length > 0) {
        toast.error(`Validation failed with ${errors.length} error(s)`)
      } else if (accountConflicts.length > 0) {
        toast.warning(`Found ${accountConflicts.length} account code conflicts`)
      } else {
        toast.success('Validation passed! Ready to import')
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.error(`Validation failed: ${error.message}`)
    } finally {
      setIsValidating(false)
    }
  }

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    if (!validation || !validation.isValid) {
      toast.error('Please validate the file first')
      return
    }

    setIsImporting(true)
    console.log('=== IMPORT STARTED ===')

    let importLog: any = null

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

      const existingAccountMap = new Map(existingAccounts?.map(a => [a.code, a.name]) || [])
      const existingProjectNames = new Set(existingProjects?.map(p => p.name) || [])

      // Extract unique accounts with conflict resolution
      const accountsMap = new Map<string, { code: string; name: string; type: AccountType }>()
      const conflictResolutions = new Map<string, string>() // original code -> new code
      
      for (const row of glRows) {
        if (existingAccountMap.has(row.accountCode)) {
          const existingName = existingAccountMap.get(row.accountCode)!
          if (existingName !== row.accountName) {
            // Conflict: code exists with different name
            // Create new code with suffix
            let newCode = `${row.accountCode}-GL`
            let counter = 1
            while (existingAccountMap.has(newCode) || accountsMap.has(newCode)) {
              newCode = `${row.accountCode}-GL${counter++}`
            }
            
            console.log(`Conflict resolved: ${row.accountCode} (${row.accountName}) -> ${newCode}`)
            conflictResolutions.set(row.accountCode, newCode)
            
            accountsMap.set(newCode, {
              code: newCode,
              name: row.accountName,
              type: getAccountTypeFromCode(row.accountCode),
            })
          }
          // else: code exists with same name, no need to create
        } else {
          // New account
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
      const { data: importLogData, error: logError } = await supabase
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
      importLog = importLogData

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

        console.log(`Creating ${accountsToInsert.length} new accounts...`)

        const { error: accountError } = await supabase
          .from('account')
          .insert(accountsToInsert)

        if (accountError) {
          console.error('Error creating accounts:', accountError)
          throw new Error(`Failed to create accounts: ${accountError.message}`)
        } else {
          accountsCreated = accountsToInsert.length
          console.log(`✓ Created ${accountsCreated} accounts`)
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

        console.log(`Creating ${projectsToInsert.length} new projects...`)

        const { error: projectError } = await supabase
          .from('project')
          .insert(projectsToInsert)

        if (projectError) {
          console.error('Error creating projects:', projectError)
          throw new Error(`Failed to create projects: ${projectError.message}`)
        } else {
          projectsCreated = projectsToInsert.length
          console.log(`✓ Created ${projectsCreated} projects`)
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

      // First, insert all journals in batch
      const journalsToInsert = Array.from(transactionGroups.entries()).map(([number, lines]) => {
        const firstLine = lines[0]
        const date = parseDate(firstLine.date)
        const period = date.substring(0, 7) // YYYY-MM
        
        return {
          number: `JRN-GL-${number}`,
          date,
          period,
          description: firstLine.description,
          status: 'POSTED' as const,
          import_log_id: importLog.id,
        }
      })

      console.log(`Inserting ${journalsToInsert.length} journals...`)

      const { data: createdJournals, error: journalError } = await supabase
        .from('journal')
        .insert(journalsToInsert)
        .select('id, number')

      if (journalError) {
        console.error('Error creating journals:', journalError)
        throw new Error(`Failed to create journals: ${journalError.message}`)
      }

      const journalsCreated = createdJournals?.length || 0
      console.log(`Created ${journalsCreated} journals`)

      // Create a map of journal number to journal ID
      const journalMap = new Map(createdJournals?.map(j => [j.number, j.id]) || [])

      // Now insert all journal lines in batch
      const allJournalLines: any[] = []
      
      for (const [number, lines] of transactionGroups) {
        const journalId = journalMap.get(`JRN-GL-${number}`)
        if (!journalId) {
          console.error(`Journal ID not found for ${number}`)
          continue
        }

        lines.forEach((line, index) => {
          // Use resolved code if there was a conflict
          const accountCode = conflictResolutions.get(line.accountCode) || line.accountCode
          
          allJournalLines.push({
            journal_id: journalId,
            account_code: accountCode,
            description: line.description,
            debit: Math.round(line.debit),
            credit: Math.round(line.credit),
            sort_order: index,
          })
        })
      }

      console.log(`Inserting ${allJournalLines.length} journal lines...`)

      // Insert in chunks of 500 to avoid payload size limits
      let linesCreated = 0
      const chunkSize = 500
      const totalChunks = Math.ceil(allJournalLines.length / chunkSize)
      
      for (let i = 0; i < allJournalLines.length; i += chunkSize) {
        const chunk = allJournalLines.slice(i, i + chunkSize)
        const chunkNumber = Math.floor(i / chunkSize) + 1
        
        try {
          const { error: lineError } = await supabase
            .from('journal_line')
            .insert(chunk)

          if (lineError) {
            console.error(`Error inserting lines chunk ${chunkNumber}/${totalChunks}:`, lineError)
            console.error('Sample failed line:', chunk[0])
            throw new Error(`Failed to insert journal lines at chunk ${chunkNumber}: ${lineError.message}`)
          }
          
          linesCreated += chunk.length
          console.log(`✓ Inserted chunk ${chunkNumber}/${totalChunks} (${linesCreated} / ${allJournalLines.length} lines)`)
        } catch (error) {
          console.error(`Fatal error on chunk ${chunkNumber}:`, error)
          throw error
        }
      }

      console.log(`✓ All ${linesCreated} journal lines inserted successfully`)

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

      console.log('=== IMPORT COMPLETED SUCCESSFULLY ===')
      toast.success(`Import completed! Created ${journalsCreated} journals with ${linesCreated} lines`)
    } catch (error) {
      console.error('=== IMPORT FAILED ===')
      console.error('Import error:', error)
      toast.error(`Import failed: ${error.message}`)
      
      // Update import log with error
      if (importLog?.id) {
        await supabase
          .from('import_log')
          .update({
            error_details: { error: error.message, stack: error.stack },
          })
          .eq('id', importLog.id)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setValidation(null)
  }

  const handleCleanup = async () => {
    if (!confirm('This will delete all journals that have no journal lines. Continue?')) {
      return
    }

    setIsCleaning(true)

    try {
      // Find journals with no lines
      const { data: brokenJournals, error: queryError } = await supabase
        .from('journal')
        .select('id')
        .not('import_log_id', 'is', null)

      if (queryError) throw queryError

      if (!brokenJournals || brokenJournals.length === 0) {
        toast.info('No broken journals found')
        return
      }

      // Check which have no lines
      const journalsToDelete: string[] = []
      for (const j of brokenJournals) {
        const { count } = await supabase
          .from('journal_line')
          .select('*', { count: 'exact', head: true })
          .eq('journal_id', j.id)
        
        if (count === 0) {
          journalsToDelete.push(j.id)
        }
      }

      if (journalsToDelete.length === 0) {
        toast.info('No broken journals found')
        return
      }

      // Delete broken journals
      const { error: deleteError } = await supabase
        .from('journal')
        .delete()
        .in('id', journalsToDelete)

      if (deleteError) throw deleteError

      toast.success(`Deleted ${journalsToDelete.length} broken journals`)
    } catch (error) {
      console.error('Cleanup error:', error)
      toast.error(`Cleanup failed: ${error.message}`)
    } finally {
      setIsCleaning(false)
    }
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

              {file && !validation && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    File loaded: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}

              {validation && (
                <div className="space-y-3">
                  <Alert variant={validation.isValid ? "default" : "destructive"}>
                    {validation.isValid ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {validation.isValid ? 'Validation Passed' : 'Validation Failed'}
                    </AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 mt-2">
                        <div className="text-sm">
                          <strong>Statistics:</strong>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            <li>Total rows: {validation.stats.totalRows}</li>
                            <li>Valid rows: {validation.stats.validRows}</li>
                            <li>Invalid rows: {validation.stats.invalidRows}</li>
                            <li>Unique accounts: {validation.stats.uniqueAccounts}</li>
                            <li>Unique transactions: {validation.stats.uniqueTransactions}</li>
                          </ul>
                        </div>

                        {validation.accountConflicts.length > 0 && (
                          <div className="text-sm">
                            <strong className="text-yellow-600">Account Conflicts ({validation.accountConflicts.length}):</strong>
                            <ul className="list-disc list-inside ml-2 mt-1 max-h-32 overflow-y-auto">
                              {validation.accountConflicts.slice(0, 5).map((conflict, i) => (
                                <li key={i}>
                                  {conflict.code}: "{conflict.existingName}" vs "{conflict.newName}"
                                </li>
                              ))}
                              {validation.accountConflicts.length > 5 && (
                                <li>... and {validation.accountConflicts.length - 5} more</li>
                              )}
                            </ul>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Conflicts will be resolved by creating new account codes with "-GL" suffix
                            </p>
                          </div>
                        )}

                        {validation.errors.length > 0 && (
                          <div className="text-sm">
                            <strong className="text-destructive">Errors ({validation.errors.length}):</strong>
                            <ul className="list-disc list-inside ml-2 mt-1 max-h-32 overflow-y-auto">
                              {validation.errors.slice(0, 5).map((error, i) => (
                                <li key={i}>{error}</li>
                              ))}
                              {validation.errors.length > 5 && (
                                <li>... and {validation.errors.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}

                        {validation.warnings.length > 0 && (
                          <div className="text-sm">
                            <strong className="text-yellow-600">Warnings ({validation.warnings.length}):</strong>
                            <ul className="list-disc list-inside ml-2 mt-1 max-h-32 overflow-y-auto">
                              {validation.warnings.slice(0, 3).map((warning, i) => (
                                <li key={i}>{warning}</li>
                              ))}
                              {validation.warnings.length > 3 && (
                                <li>... and {validation.warnings.length - 3} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCleanup}
                disabled={isCleaning}
                variant="outline"
                className="flex-1"
              >
                {isCleaning ? 'Cleaning...' : 'Clean Broken Journals'}
              </Button>
              
              {!validation ? (
                <Button
                  onClick={validateImport}
                  disabled={!file || isValidating}
                  className="flex-1"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  {isValidating ? 'Validating...' : 'Validate File'}
                </Button>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={!validation.isValid || isImporting}
                  className="flex-1"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import General Ledger'}
                </Button>
              )}
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
