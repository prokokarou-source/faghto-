import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getRedirectPathForRole } from '@/lib/auth/get-redirect-path'

export const dynamic = 'force-dynamic'

export default async function RedirectPage() {
  const staff = await getStaffRole()

  if (!staff) {
    redirect('/login')
  }

  redirect(getRedirectPathForRole(staff.role))
}
