import { getStaffRole } from '@/lib/auth/get-staff-role'
import { createClient } from '@/lib/supabase/server'
import { InviteStaffForm } from '@/components/admin/InviteStaffForm'

export const dynamic = 'force-dynamic'

export default async function AdminStaffPage() {
  const staff = await getStaffRole()
  if (!staff) return null

  const supabase = await createClient()
  const { data: staffList } = await supabase
    .from('staff')
    .select('id, role, display_name, created_at')
    .eq('restaurant_id', staff.restaurantId)
    .order('created_at')

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Διαχείριση προσωπικού</h1>

      <ul className="mt-6 space-y-2">
        {(staffList ?? []).map((member) => (
          <li key={member.id} className="rounded border border-gray-200 p-3 text-sm text-gray-700">
            <span className="font-medium text-gray-900">{member.display_name ?? '(χωρίς όνομα)'}</span> ·{' '}
            {member.role === 'admin' ? 'Διαχειριστής' : 'Σερβιτόρος'} · μέλος από{' '}
            {new Date(member.created_at).toLocaleDateString('el-GR')}
          </li>
        ))}
      </ul>

      <InviteStaffForm />
    </main>
  )
}
