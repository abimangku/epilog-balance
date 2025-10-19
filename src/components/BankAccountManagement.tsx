import { useState } from 'react'
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount } from '@/hooks/useBankAccounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAccounts } from '@/hooks/useAccounts'
import { useToast } from '@/hooks/use-toast'
import { Landmark } from 'lucide-react'

export function BankAccountManagement() {
  const { data: bankAccounts, isLoading } = useBankAccounts()
  const { data: accounts } = useAccounts()
  const createBank = useCreateBankAccount()
  const updateBank = useUpdateBankAccount()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<any>(null)
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_code: '1-10200',
  })

  const cashAccounts = accounts?.filter(a => a.code.startsWith('1-10')) || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingBank) {
        await updateBank.mutateAsync({ id: editingBank.id, ...formData })
        toast({ title: 'Bank Account Updated', description: 'Bank account updated successfully' })
      } else {
        await createBank.mutateAsync(formData)
        toast({ title: 'Bank Account Created', description: 'Bank account created successfully' })
      }
      
      setIsDialogOpen(false)
      setEditingBank(null)
      setFormData({ bank_name: '', account_number: '', account_code: '1-10200' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save bank account',
        variant: 'destructive'
      })
    }
  }

  const openEditDialog = (bank: any) => {
    setEditingBank(bank)
    setFormData({
      bank_name: bank.bank_name,
      account_number: bank.account_number,
      account_code: bank.account_code,
    })
    setIsDialogOpen(true)
  }

  if (isLoading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage your bank accounts and link to chart of accounts</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingBank(null)
              setFormData({ bank_name: '', account_number: '', account_code: '1-10200' })
            }}>
              <Landmark className="h-4 w-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBank ? 'Edit' : 'Add'} Bank Account</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bank Name *</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. Bank Syariah Indonesia"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Account Number *</label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g. 7012345678"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Linked GL Account *</label>
                <select
                  value={formData.account_code}
                  onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  This links the bank account to your chart of accounts
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={createBank.isPending || updateBank.isPending}>
                  {editingBank ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Name</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankAccounts?.map((bank: any) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.bank_name}</TableCell>
                  <TableCell className="font-mono">{bank.account_number}</TableCell>
                  <TableCell>
                    <code className="text-sm">{bank.account_code}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={bank.is_active ? 'default' : 'secondary'}>
                      {bank.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(bank)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {bankAccounts?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No bank accounts yet. Click "Add Bank Account" to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
