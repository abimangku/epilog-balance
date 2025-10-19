import { useState } from 'react'
import { useProjects, useClients, useCreateProject, useUpdateProject } from '@/hooks/useMasterData'
import { useToast } from '@/hooks/use-toast'

export function ProjectManagement() {
  const { data: projects } = useProjects()
  const { data: clients } = useClients()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    clientId: '',
    description: '',
    startDate: '',
    endDate: '',
    budgetAmount: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingProject) {
        await updateProject.mutateAsync({ id: editingProject.id, ...formData })
        toast({ title: 'Project updated successfully' })
      } else {
        await createProject.mutateAsync(formData)
        toast({ title: 'Project created successfully' })
      }
      
      resetForm()
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to save project',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      clientId: '',
      description: '',
      startDate: '',
      endDate: '',
      budgetAmount: 0,
      status: 'ACTIVE',
      notes: '',
    })
    setEditingProject(null)
    setShowForm(false)
  }

  const handleEdit = (project: any) => {
    setFormData({
      code: project.code,
      name: project.name,
      clientId: project.client_id,
      description: project.description || '',
      startDate: project.start_date || '',
      endDate: project.end_date || '',
      budgetAmount: project.budget_amount || 0,
      status: project.status || 'ACTIVE',
      notes: project.notes || '',
    })
    setEditingProject(project)
    setShowForm(true)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'ON_HOLD': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Project Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">
            {editingProject ? 'Edit Project' : 'New Project'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="PRJ-001"
                  required
                  disabled={!!editingProject}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  placeholder="Website Redesign"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  required
                >
                  <option value="">Select client...</option>
                  {clients?.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Budget Amount (IDR)</label>
              <input
                type="number"
                value={formData.budgetAmount}
                onChange={(e) => setFormData({ ...formData, budgetAmount: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 bg-background"
                min="0"
                placeholder="50000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 bg-background"
                rows={3}
                placeholder="Project description..."
              />
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
                disabled={createProject.isPending || updateProject.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {editingProject ? 'Update' : 'Create'} Project
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

      {/* Project List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="text-left p-3 border">Code</th>
              <th className="text-left p-3 border">Name</th>
              <th className="text-left p-3 border">Client</th>
              <th className="text-center p-3 border">Status</th>
              <th className="text-right p-3 border">Budget</th>
              <th className="text-left p-3 border">Dates</th>
              <th className="text-center p-3 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects?.map((project) => (
              <tr key={project.id} className="hover:bg-muted/50">
                <td className="p-3 border font-mono">{project.code}</td>
                <td className="p-3 border font-semibold">{project.name}</td>
                <td className="p-3 border">{project.client?.name || '-'}</td>
                <td className="p-3 border text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(project.status)}`}>
                    {project.status}
                  </span>
                </td>
                <td className="p-3 border text-right font-mono">
                  {(project as any).budget_amount ? Number((project as any).budget_amount).toLocaleString() : '-'}
                </td>
                <td className="p-3 border text-sm">
                  {project.start_date && project.end_date ? 
                    `${project.start_date} to ${project.end_date}` : '-'}
                </td>
                <td className="p-3 border text-center">
                  <button
                    onClick={() => handleEdit(project)}
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
