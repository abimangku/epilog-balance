import { useState } from 'react'
import { useAccountsByType, useCreateAccount, useUpdateAccount, ACCOUNT_TYPE_LABELS } from '@/hooks/useAccounts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Edit } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export default function AccountManagement() {
  const { data: accountsByType, isLoading } = useAccountsByType()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ASSET' as any,
    parent_code: '',
    is_active: true,
  })

  const handleSubmit = async () => {
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({
          id: editingAccount.id,
          ...formData,
        })
        toast({ title: 'Account updated successfully' })
      } else {
        await createAccount.mutateAsync(formData)
        toast({ title: 'Account created successfully' })
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      type: 'ASSET',
      parent_code: '',
      is_active: true,
    })
    setEditingAccount(null)
  }

  const openEditDialog = (account: any) => {
    setEditingAccount(account)
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      parent_code: account.parent_code || '',
      is_active: account.is_active,
    })
    setIsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const accountData = accountsByType || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Chart of Accounts</h1>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Edit Account' : 'New Account'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Account Code</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="1-10000"
                  disabled={!!editingAccount}
                />
              </div>
              <div>
                <Label>Account Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Cash in Bank"
                />
              </div>
              <div>
                <Label>Account Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full" disabled={createAccount.isPending || updateAccount.isPending}>
                {(createAccount.isPending || updateAccount.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        {Object.entries(accountData).map(([type, accounts]) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{ACCOUNT_TYPE_LABELS[type as keyof typeof ACCOUNT_TYPE_LABELS]}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Code</th>
                    <th className="text-left py-2">Account Name</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(accounts as any[]).map((account: any) => (
                    <tr key={account.id} className="border-b">
                      <td className="py-2 font-mono">{account.code}</td>
                      <td className="py-2">{account.name}</td>
                      <td className="py-2">
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
