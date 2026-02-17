import { createAdminClient } from '@/lib/supabase/admin'
import UserCardList from '@/components/admin/UserCardList'

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  // Fetch customers
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, role, name, phone, state, created_at')
    .order('created_at', { ascending: false })

  if (customersError) {
    console.error('Error fetching customers:', customersError)
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Users</h1>
        <p className="text-red-500">Failed to load users. Please check console.</p>
      </div>
    )
  }

  // Fetch auth users to get emails
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('Error fetching auth users:', authError)
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Users</h1>
        <p className="text-red-500">Failed to load users. Please check console.</p>
      </div>
    )
  }

  // Combine and ensure role is never null
  const users = (customers || []).map(customer => {
    const authUser = authUsers.users.find(u => u.id === customer.id)
    return {
      id: customer.id,
      email: authUser?.email || 'Unknown',
      role: customer.role || 'user', // 👈 fallback to 'user' if null
      name: customer.name,
      phone: customer.phone,
      state: customer.state,
      created_at: customer.created_at,
    }
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Users</h1>
      <UserCardList users={users} />
    </div>
  )
}