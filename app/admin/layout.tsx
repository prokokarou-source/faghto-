import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffRole()

  if (!staff || staff.role !== 'admin') {
    redirect('/login')
  }

  return <>{children}</>
}
