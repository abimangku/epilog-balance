import { useState } from 'react'
import { useClients, useCreateClient, useUpdateClient } from '@/hooks/useMasterData'
import { useToast } from '@/hooks/use-toast'

export function ClientManagement() {
  const { data: clients } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)

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
    withholdsPPh23: false,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingClient) {
        await updateClient.mutateAsync({ id: editingClient.id, ...formData })
        toast({ title: 'Client updated successfully' })
      } else {
        await createClient.mutateAsync(formData)
        toast({ title: 'Client created successfully' })
      }
      
      resetForm()
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save client',
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
      withholdsPPh23: false,
      notes: '',
    })
    setEditingClient(null)
    setShowForm(false)
  }

  const handleEdit = (client: any) => {
    setFormData({
      code: client.code,
      name: client.name,
      taxId: client.tax_id || '',
      email: client.email || '',
      contactPerson: client.contact_person || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      paymentTerms: client.payment_terms || 30,
      withholdsPPh23: client.withholds_pph23 || false,
      notes: client.notes || '',
    })
    setEditingClient(client)
    setShowForm(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Client Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : '+ New Client'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingClient ? 'Edit Client' : 'New Client'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="BSI"
                  required
                  disabled={!!editingClient}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="PT Bank Syariah Indonesia"
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
                  placeholder="contact@bsi.co.id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="John Doe"
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

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.withholdsPPh23}
                onChange={(e) => setFormData({ ...formData, withholdsPPh23: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm">Client withholds PPh 23 (2%) on payments</label>
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
                disabled={createClient.isPending || updateClient.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {editingClient ? 'Update' : 'Create'} Client
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

      {/* Client List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Code</th>
              <th className="text-left p-3 border">Name</th>
              <th className="text-left p-3 border">Contact</th>
              <th className="text-left p-3 border">Phone</th>
              <th className="text-center p-3 border">Payment Terms</th>
              <th className="text-center p-3 border">PPh 23</th>
              <th className="text-center p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
              <tr key={client.id} className="hover:bg-muted/50">
                <td className="p-3 border font-mono">{client.code}</td>
                <td className="p-3 border">{client.name}</td>
                <td className="p-3 border">{(client as any).contact_person || '-'}</td>
                <td className="p-3 border">{client.phone || '-'}</td>
                <td className="p-3 border text-center">Net {client.payment_terms}</td>
                <td className="p-3 border text-center">
                  {client.withholds_pph23 ? '✓' : '-'}
                </td>
                <td className="p-3 border text-center">
                  <button
                    onClick={() => handleEdit(client)}
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
