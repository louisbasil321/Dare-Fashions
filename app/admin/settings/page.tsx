'use server'
import AdminSocialSettings from '@/components/admin/AdminSocialSettings'

export default async function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Manage Socials</h1>
      
      {/* Filtering (optional – you can add filter UI here later) */}
      {/* Status filter could be added as select dropdowns */}
   
      <AdminSocialSettings />
    </div>
  )
}