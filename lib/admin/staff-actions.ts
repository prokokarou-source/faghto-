'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getSupabaseEnv } from '@/lib/env'
import { getStaffRole } from '@/lib/auth/get-staff-role'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}

export async function inviteStaff(
  formData: FormData
): Promise<{ error: string } | { password: string }> {
  const staff = await getStaffRole()
  if (!staff || staff.role !== 'admin') {
    return { error: 'Δεν έχεις δικαίωμα.' }
  }

  const email = String(formData.get('email') ?? '').trim()
  const role = String(formData.get('role') ?? '')

  if (!email || (role !== 'admin' && role !== 'waiter')) {
    return { error: 'Συμπλήρωσε έγκυρο email και ρόλο.' }
  }

  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: 'Server misconfigured.' }
  }

  const supabase = createServiceClient(url, serviceRoleKey)
  const password = generatePassword()

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authUser.user) {
    return { error: authError?.message ?? 'Αποτυχία δημιουργίας λογαριασμού.' }
  }

  const { error: staffError } = await supabase.from('staff').insert({
    restaurant_id: staff.restaurantId,
    auth_user_id: authUser.user.id,
    role,
  })

  if (staffError) {
    return { error: staffError.message }
  }

  revalidatePath('/admin/staff')
  return { password }
}
