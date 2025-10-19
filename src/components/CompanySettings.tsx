import { useState, useEffect } from 'react'
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCriticalFeatures'
import { useToast } from '@/hooks/use-toast'

export function CompanySettings() {
  const { data: settings, isLoading } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()
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
    }
  }, [settings])

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

  if (isLoading) {
    return <div className="p-6 text-foreground">Loading settings...</div>
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Company Settings</h1>

      <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-foreground">Company Name *</label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              required
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-foreground">Legal Name</label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              placeholder="PT [Company Name] Indonesia"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">NPWP (Tax ID)</label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              placeholder="01.234.567.8-901.000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1 text-foreground">Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Postal Code</label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              placeholder="+62 21 1234 5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Website</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              placeholder="https://epilog.co.id"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Fiscal Year End</label>
            <input
              type="text"
              value={formData.fiscal_year_end}
              onChange={(e) => setFormData({ ...formData, fiscal_year_end: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
              placeholder="MM-DD (e.g., 12-31)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">Base Currency</label>
            <select
              value={formData.base_currency}
              onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
              className="w-full border border-input rounded-md px-3 py-2 bg-background text-foreground"
            >
              <option value="IDR">IDR - Indonesian Rupiah</option>
              <option value="USD">USD - US Dollar</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
