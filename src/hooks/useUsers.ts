import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_roles')
      if (error) throw error
      return data as Array<{
        user_id: string
        email: string
        role: string
        created_at: string
      }>
    },
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' | 'viewer' }) => {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Then insert new role if not viewer (viewer is default)
      if (role !== 'viewer') {
        const { data, error } = await supabase
          .from('user_roles')
          .insert([{ user_id: userId, role: role as 'admin' | 'user' }])
          .select()
          .single()

        if (error) throw error
        return data
      }
      return null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
