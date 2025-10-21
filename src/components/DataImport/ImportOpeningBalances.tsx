import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface BalanceRow {
  accountCode: string
  accountName: string
  debit: number
  credit: number
}

export function ImportOpeningBalances() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<BalanceRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: boolean; journalNumber?: string; error?: string } | null>(null)
  const { toast } = useToast()

  const parseAccountCode = (nameWithCode: string): string => {
    const match = nameWithCode.match(/\(([^)]+)\)/)
    return match ? match[1] : ''
  }

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

      const openingBalances = jsonData
        .filter((row) => row['Transaksi'] === 'Saldo Awal')
        .map((row) => {
          const accountCode = parseAccountCode(row['Nama Akun'])
          const saldo = parseFloat(row['Saldo']) || 0
          
          return {
            accountCode,
            accountName: row['Nama Akun'],
            debit: saldo >= 0 ? Math.abs(saldo) : 0,
            credit: saldo < 0 ? Math.abs(saldo) : 0,
          }
        })
        .filter((row) => row.accountCode && (row.debit > 0 || row.credit > 0))

      setPreview(openingBalances.slice(0, 10))

      const totalDebit = openingBalances.reduce((sum, row) => sum + row.debit, 0)
      const totalCredit = openingBalances.reduce((sum, row) => sum + row.credit, 0)

      toast({
        title: 'File loaded',
        description: `Found ${openingBalances.length} opening balances. Total DR: ${totalDebit.toLocaleString()}, CR: ${totalCredit.toLocaleString()}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error reading file',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setProgress(20)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const openingBalances = jsonData
        .filter((row) => row['Transaksi'] === 'Saldo Awal')
        .map((row) => {
          const accountCode = parseAccountCode(row['Nama Akun'])
          const saldo = parseFloat(row['Saldo']) || 0
          
          return {
            accountCode,
            debit: saldo >= 0 ? Math.abs(saldo) : 0,
            credit: saldo < 0 ? Math.abs(saldo) : 0,
          }
        })
        .filter((row) => row.accountCode && (row.debit > 0 || row.credit > 0))

      setProgress(40)

      // Create journal entry
      const journalNumber = `JV-2025-0001`
      const { data: journalData, error: journalError } = await supabase
        .from('journal')
        .insert({
          number: journalNumber,
          date: '2025-01-01',
          description: 'Opening Balances - Migrated from Mekari Jurnal',
          period: '2025-01',
          status: 'POSTED',
        })
        .select()
        .single()

      if (journalError) throw journalError

      setProgress(60)

      // Create journal lines
      const journalLines = openingBalances.map((row, index) => ({
        journal_id: journalData.id,
        account_code: row.accountCode,
        debit: row.debit,
        credit: row.credit,
        sort_order: index,
      }))

      const { error: linesError } = await supabase
        .from('journal_line')
        .insert(journalLines)

      if (linesError) throw linesError

      setProgress(80)

      // Log import
      await supabase.from('import_log').insert({
        import_type: 'opening_balances',
        file_name: file.name,
        file_size: file.size,
        records_total: openingBalances.length,
        records_success: openingBalances.length,
        records_failed: 0,
        error_details: { journal_id: journalData.id },
      })

      setProgress(100)
      setResult({ success: true, journalNumber })

      toast({
        title: 'Import complete',
        description: `Opening balances imported as ${journalNumber}`,
      })
    } catch (error: any) {
      setResult({ success: false, error: error.message })
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
        <CardTitle>Import Opening Balances</CardTitle>
        <CardDescription>
          Upload your Mekari Jurnal General Ledger with opening balances (Saldo Awal)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="balance-file">CSV/Excel File</Label>
          <Input
            id="balance-file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        {preview.length > 0 && !result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Preview (first 10 accounts):</p>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Account</th>
                        <th className="text-right p-2">Debit</th>
                        <th className="text-right p-2">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 text-xs">{row.accountName}</td>
                          <td className="p-2 text-right">{row.debit.toLocaleString()}</td>
                          <td className="p-2 text-right">{row.credit.toLocaleString()}</td>
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
            <p className="text-sm text-muted-foreground text-center">
              Creating opening balance journal... {Math.round(progress)}%
            </p>
          </div>
        )}

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {result.success ? (
                <p>✓ Opening balances imported successfully as journal #{result.journalNumber}</p>
              ) : (
                <p>✗ Import failed: {result.error}</p>
              )}
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
            Import Opening Balances
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
