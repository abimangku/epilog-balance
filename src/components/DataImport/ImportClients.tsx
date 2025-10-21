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

interface ClientRow {
  name: string
  email: string
  phone: string
  address: string
  taxId: string
}

export function ImportClients() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ClientRow[]>([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ success: number; failed: number; errors: any[] } | null>(null)
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
        .filter((row) => row['*Type'] === 'customer')
        .map((row) => ({
          name: row['*DisplayName'] || row['DisplayName'],
          email: row['Email'] || '',
          phone: row['Mobile'] || row['Phone'] || '',
          address: row['BillingAddress'] || '',
          taxId: row['TaxNumber'] || '',
        }))
        .filter((row) => row.name)

      setPreview(mapped.slice(0, 10))
      toast({
        title: 'File loaded',
        description: `Found ${mapped.length} clients. Showing first 10 for preview.`,
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
    setProgress(0)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      const clients = jsonData
        .filter((row) => row['*Type'] === 'customer')
        .map((row, index) => ({
          code: `CUST-${String(index + 1).padStart(4, '0')}`,
          name: row['*DisplayName'] || row['DisplayName'],
          email: row['Email'] || '',
          contact_person: row['Title'] ? `${row['Title']} ${row['FirstName'] || ''} ${row['LastName'] || ''}`.trim() : '',
          phone: row['Mobile'] || row['Phone'] || '',
          address: row['BillingAddress'] || '',
          city: row['BillingAddressCity'] || '',
          tax_id: row['TaxNumber'] || '',
          payment_terms: 30,
          is_active: true,
        }))
        .filter((row) => row.name)

      const { data: importLogData, error: logError } = await supabase
        .from('import_log')
        .insert({
          import_type: 'clients',
          file_name: file.name,
          file_size: file.size,
          records_total: clients.length,
          records_success: 0,
          records_failed: 0,
          error_details: [],
        })
        .select()
        .single()

      if (logError) throw logError

      let successCount = 0
      let failedCount = 0
      const errors: any[] = []

      for (let i = 0; i < clients.length; i++) {
        try {
          const { error } = await supabase.from('client').insert({
            ...clients[i],
            import_log_id: importLogData.id,
          })

          if (error) throw error
          successCount++
        } catch (error: any) {
          failedCount++
          errors.push({ row: i + 1, ...clients[i], error: error.message })
        }
        setProgress(((i + 1) / clients.length) * 100)
      }

      await supabase
        .from('import_log')
        .update({
          records_success: successCount,
          records_failed: failedCount,
          error_details: errors,
        })
        .eq('id', importLogData.id)

      setResult({ success: successCount, failed: failedCount, errors })

      toast({
        title: 'Import complete',
        description: `Successfully imported ${successCount} clients. ${failedCount} failed.`,
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
        <CardTitle>Import Client Contacts</CardTitle>
        <CardDescription>
          Upload your Mekari Jurnal contact list (customers only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client-file">CSV/Excel File</Label>
          <Input
            id="client-file"
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
                <p className="font-semibold">Preview (first 10 clients):</p>
                <div className="max-h-60 overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 text-xs">{row.email}</td>
                          <td className="p-2">{row.phone}</td>
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
              Importing... {Math.round(progress)}%
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
                <p>✓ Successfully imported: {result.success}</p>
                {result.failed > 0 && <p>✗ Failed: {result.failed}</p>}
                {result.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer">View errors</summary>
                    <div className="mt-2 space-y-1">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <div key={i}>
                          Row {err.row}: {err.name} - {err.error}
                        </div>
                      ))}
                      {result.errors.length > 5 && (
                        <p>... and {result.errors.length - 5} more errors</p>
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
            Import Clients
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
