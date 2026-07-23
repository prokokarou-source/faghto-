import { createClient } from '@/lib/supabase/server'
import type { StaffRole } from '@/lib/auth/get-redirect-path'

export async function getStaffRole(): Promise<{ role: StaffRole; restaurantId: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('staff')
    .select('role, restaurant_id')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !data) return null

  return { role: data.role as StaffRole, restaurantId: data.restaurant_id as string }
}
