import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'
import { AdminNav } from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffRole()

  if (!staff || staff.role !== 'admin') {
    redirect('/login')
  }

  return (
    <>
      <AdminNav />
      {children}
    </>
  )
}
