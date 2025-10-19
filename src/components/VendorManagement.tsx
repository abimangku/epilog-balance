import { useState } from 'react'
import { useVendors } from '@/hooks/useVendors'
import { useCreateVendor, useUpdateVendor } from '@/hooks/useMasterData'
import { useToast } from '@/hooks/use-toast'

export function VendorManagement() {
  const { data: vendors } = useVendors()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState<any>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    taxId: '',
    email: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    paymentTerms: 30,
    providesFakturPajak: false,
    subjectToPPh23: false,
    pph23Rate: 0.02,
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingVendor) {
        await updateVendor.mutateAsync({ id: editingVendor.id, ...formData })
        toast({ title: 'Vendor updated successfully' })
      } else {
        await createVendor.mutateAsync(formData)
        toast({ title: 'Vendor created successfully' })
      }
      
      resetForm()
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save vendor',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      taxId: '',
      email: '',
      contactPerson: '',
      phone: '',
      address: '',
      city: '',
      paymentTerms: 30,
      providesFakturPajak: false,
      subjectToPPh23: false,
      pph23Rate: 0.02,
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
      notes: '',
    })
    setEditingVendor(null)
    setShowForm(false)
  }

  const handleEdit = (vendor: any) => {
    setFormData({
      code: vendor.code,
      name: vendor.name,
      taxId: vendor.tax_id || '',
      email: vendor.email || '',
      contactPerson: vendor.contact_person || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      paymentTerms: vendor.payment_terms || 30,
      providesFakturPajak: vendor.provides_faktur_pajak || false,
      subjectToPPh23: vendor.subject_to_pph23 || false,
      pph23Rate: vendor.pph23_rate || 0.02,
      bankName: vendor.bank_name || '',
      bankAccountNumber: vendor.bank_account_number || '',
      bankAccountName: vendor.bank_account_name || '',
      notes: vendor.notes || '',
    })
    setEditingVendor(vendor)
    setShowForm(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendor Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : '+ New Vendor'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingVendor ? 'Edit Vendor' : 'New Vendor'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Vendor Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="AWS"
                  required
                  disabled={!!editingVendor}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="Amazon Web Services"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">NPWP (Tax ID)</label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="01.234.567.8-901.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="billing@aws.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="Jane Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="+62 21 1234 5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="Jakarta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Terms (days)</label>
                <input
                  type="number"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="Bank BCA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="1234567890"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Bank Account Name</label>
                <input
                  type="text"
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="PT Amazon Web Services Indonesia"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-background"
                rows={2}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.providesFakturPajak}
                  onChange={(e) => setFormData({ ...formData, providesFakturPajak: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Vendor provides Faktur Pajak (PKP)</label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.subjectToPPh23}
                  onChange={(e) => setFormData({ ...formData, subjectToPPh23: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Subject to PPh 23 withholding</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-background"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={createVendor.isPending || updateVendor.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {editingVendor ? 'Update' : 'Create'} Vendor
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendor List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Code</th>
              <th className="text-left p-3 border">Name</th>
              <th className="text-left p-3 border">Contact</th>
              <th className="text-left p-3 border">Bank</th>
              <th className="text-center p-3 border">PKP</th>
              <th className="text-center p-3 border">PPh 23</th>
              <th className="text-center p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors?.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-muted/50">
                <td className="p-3 border font-mono">{vendor.code}</td>
                <td className="p-3 border">{vendor.name}</td>
                <td className="p-3 border">{(vendor as any).contact_person || '-'}</td>
                <td className="p-3 border">{(vendor as any).bank_name || '-'}</td>
                <td className="p-3 border text-center">
                  {vendor.provides_faktur_pajak ? '✓' : '-'}
                </td>
                <td className="p-3 border text-center">
                  {vendor.subject_to_pph23 ? '✓' : '-'}
                </td>
                <td className="p-3 border text-center">
                  <button
                    onClick={() => handleEdit(vendor)}
                    className="text-primary hover:underline text-sm"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
