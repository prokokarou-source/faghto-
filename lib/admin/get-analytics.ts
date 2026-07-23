import { createClient } from '@/lib/supabase/server'

export type AdminAnalytics = {
  requestsToday: number
  averageResolutionMinutes: number | null
}

export async function getAnalytics(restaurantId: string): Promise<AdminAnalytics> {
  const supabase = await createClient()

  const { data: tables } = await supabase
    .from('tables')
    .select('id')
    .eq('restaurant_id', restaurantId)

  const tableIds = (tables ?? []).map((table) => table.id)
  if (tableIds.length === 0) {
    return { requestsToday: 0, averageResolutionMinutes: null }
  }

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const { count: requestsToday } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .in('table_id', tableIds)
    .gte('created_at', startOfToday.toISOString())

  const { data: resolvedRequests } = await supabase
    .from('requests')
    .select('created_at, resolved_at')
    .in('table_id', tableIds)
    .not('resolved_at', 'is', null)

  let averageResolutionMinutes: number | null = null
  if (resolvedRequests && resolvedRequests.length > 0) {
    const totalMinutes = resolvedRequests.reduce((sum, request) => {
      const created = new Date(request.created_at).getTime()
      const resolved = new Date(request.resolved_at as string).getTime()
      return sum + (resolved - created) / 60000
    }, 0)
    averageResolutionMinutes = totalMinutes / resolvedRequests.length
  }

  return {
    requestsToday: requestsToday ?? 0,
    averageResolutionMinutes,
  }
}
