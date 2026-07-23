import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/env'

export async function getTableByQrToken(
  qrToken: string,
  restaurantId: string
): Promise<{ id: string; label: string } | null> {
  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) return null

  const supabase = createClient(url, serviceRoleKey)

  const { data, error } = await supabase
    .from('tables')
    .select('id, label')
    .eq('qr_token', qrToken)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) return null

  return data
}
