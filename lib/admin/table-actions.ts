'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTable(formData: FormData) {
  const restaurantId = String(formData.get('restaurantId'))
  const label = String(formData.get('label') ?? '').trim()
  if (!label) return

  const supabase = await createClient()
  await supabase.from('tables').insert({ restaurant_id: restaurantId, label })
  revalidatePath('/admin/tables')
}

export async function deleteTable(formData: FormData) {
  const id = String(formData.get('id'))
  const supabase = await createClient()
  await supabase.from('tables').delete().eq('id', id)
  revalidatePath('/admin/tables')
}
