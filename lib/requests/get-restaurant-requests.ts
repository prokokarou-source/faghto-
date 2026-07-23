import { createClient } from '@/lib/supabase/server'

export type StaffRequest = {
  id: string
  tableId: string
  tableLabel: string
  type: 'call_waiter' | 'bill'
  status: 'pending' | 'acknowledged' | 'resolved'
  createdAt: string
}

export async function getRestaurantRequests(restaurantId: string): Promise<StaffRequest[]> {
  const supabase = await createClient()

  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, label')
    .eq('restaurant_id', restaurantId)

  if (tablesError || !tables || tables.length === 0) return []

  const tableLabelById = new Map(tables.map((table) => [table.id, table.label]))
  const tableIds = tables.map((table) => table.id)

  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('id, table_id, type, status, created_at')
    .in('table_id', tableIds)
    .neq('status', 'resolved')
    .order('created_at', { ascending: true })

  if (requestsError || !requests) return []

  return requests.map((request) => ({
    id: request.id,
    tableId: request.table_id,
    tableLabel: tableLabelById.get(request.table_id) ?? '?',
    type: request.type as StaffRequest['type'],
    status: request.status as StaffRequest['status'],
    createdAt: request.created_at,
  }))
}
