import { useState, useEffect } from 'react'
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCriticalFeatures'
import { useUsers, useUpdateUserRole } from '@/hooks/useUsers'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'

export function CompanySettings() {
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()
  const { data: users, isLoading: usersLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    id: '',
    company_name: '',
    legal_name: '',
    tax_id: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Indonesia',
    phone: '',
    email: '',
    website: '',
    fiscal_year_end: '12-31',
    base_currency: 'IDR',
  })

  const [preferences, setPreferences] = useState({
    accounting_method: 'accrual',
    auto_close_days: '30',
    enable_multi_currency: false,
    number_format: 'id',
    date_format: 'dd/MM/yyyy',
    timezone: 'Asia/Jakarta',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        id: (settings as any).id,
        company_name: (settings as any).company_name || '',
        legal_name: (settings as any).legal_name || '',
        tax_id: (settings as any).tax_id || '',
        address: (settings as any).address || '',
        city: (settings as any).city || '',
        postal_code: (settings as any).postal_code || '',
        country: (settings as any).country || 'Indonesia',
        phone: (settings as any).phone || '',
        email: (settings as any).email || '',
        website: (settings as any).website || '',
        fiscal_year_end: (settings as any).fiscal_year_end || '12-31',
        base_currency: (settings as any).base_currency || 'IDR',
      })

      // Load preferences from settings key-value table
      loadPreferences()
    }
  }, [settings])

  const loadPreferences = async () => {
    const keys = ['accounting_method', 'auto_close_days', 'enable_multi_currency', 'number_format', 'date_format', 'timezone']
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', keys.map(k => k.toUpperCase()))

    if (data) {
      const prefs: any = {}
      data.forEach(item => {
        const key = item.key.toLowerCase()
        prefs[key] = item.value === 'true' ? true : item.value === 'false' ? false : item.value
      })
      setPreferences(prev => ({ ...prev, ...prefs }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateSettings.mutateAsync(formData)
      toast({
        title: "Settings saved",
        description: "Company settings have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: "destructive",
      })
    }
  }

  const handlePreferencesSave = async () => {
    try {
      // Save each preference to settings table
      const updates = Object.entries(preferences).map(([key, value]) => ({
        key: key.toUpperCase(),
        value: String(value),
      }))

      for (const update of updates) {
        await supabase
          .from('settings')
          .upsert({ 
            key: update.key, 
            value: update.value,
            description: `System preference: ${update.key}`
          }, { onConflict: 'key' })
      }

      toast({
        title: "Preferences saved",
        description: "System preferences have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save preferences',
        variant: "destructive",
      })
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'viewer') => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update role',
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading settings...</div>
  }

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Settings</h1>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your company details and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="legal_name">Legal Name</Label>
                    <Input
                      id="legal_name"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      placeholder="PT [Company Name] Indonesia"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tax_id">NPWP (Tax ID)</Label>
                    <Input
                      id="tax_id"
                      value={formData.tax_id}
                      onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                      placeholder="01.234.567.8-901.000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+62 21 1234 5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://epilog.co.id"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fiscal_year_end">Fiscal Year End</Label>
                    <Input
                      id="fiscal_year_end"
                      value={formData.fiscal_year_end}
                      onChange={(e) => setFormData({ ...formData, fiscal_year_end: e.target.value })}
                      placeholder="MM-DD (e.g., 12-31)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="base_currency">Base Currency</Label>
                    <Select
                      value={formData.base_currency}
                      onValueChange={(value) => setFormData({ ...formData, base_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? 'Saving...' : 'Save Company Info'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounting">
          <Card>
            <CardHeader>
              <CardTitle>Accounting Preferences</CardTitle>
              <CardDescription>Configure accounting method and fiscal settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="accounting_method">Accounting Method</Label>
                <Select
                  value={preferences.accounting_method}
                  onValueChange={(value) => setPreferences({ ...preferences, accounting_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accrual">Accrual Basis (PSAK compliant)</SelectItem>
                    <SelectItem value="cash">Cash Basis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="auto_close_days">Auto-close Period After (days)</Label>
                <Input
                  id="auto_close_days"
                  type="number"
                  value={preferences.auto_close_days}
                  onChange={(e) => setPreferences({ ...preferences, auto_close_days: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically lock periods {preferences.auto_close_days} days after month end
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="multi_currency">Enable Multi-Currency</Label>
                  <p className="text-xs text-muted-foreground">Support transactions in multiple currencies</p>
                </div>
                <Switch
                  id="multi_currency"
                  checked={preferences.enable_multi_currency}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, enable_multi_currency: checked })}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePreferencesSave}>Save Accounting Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-muted-foreground">Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.user_id, value as any)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="viewer">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Configure number format, date format, and timezone</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="number_format">Number Format</Label>
                <Select
                  value={preferences.number_format}
                  onValueChange={(value) => setPreferences({ ...preferences, number_format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">1.234.567,89 (Indonesian)</SelectItem>
                    <SelectItem value="us">1,234,567.89 (US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date_format">Date Format</Label>
                <Select
                  value={preferences.date_format}
                  onValueChange={(value) => setPreferences({ ...preferences, date_format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/MM/yyyy">31/12/2025</SelectItem>
                    <SelectItem value="MM/dd/yyyy">12/31/2025</SelectItem>
                    <SelectItem value="yyyy-MM-dd">2025-12-31</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => setPreferences({ ...preferences, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Jakarta">WIB (UTC+7)</SelectItem>
                    <SelectItem value="Asia/Makassar">WITA (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Jayapura">WIT (UTC+9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePreferencesSave}>Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
