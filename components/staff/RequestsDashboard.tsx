'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffRequest } from '@/lib/requests/get-restaurant-requests'

const TYPE_LABELS: Record<StaffRequest['type'], string> = {
  call_waiter: 'Κάλεσε σερβιτόρο',
  bill: 'Ζήτα λογαριασμό',
}

const STATUS_LABELS: Record<StaffRequest['status'], string> = {
  pending: 'Εκκρεμεί',
  acknowledged: 'Σε εξέλιξη',
  resolved: 'Ολοκληρώθηκε',
}

async function fetchOpenRequests(): Promise<StaffRequest[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requests')
    .select('id, table_id, type, status, created_at, tables(label)')
    .neq('status', 'resolved')
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    tableId: row.table_id,
    tableLabel: (row.tables as unknown as { label: string } | null)?.label ?? '?',
    type: row.type as StaffRequest['type'],
    status: row.status as StaffRequest['status'],
    createdAt: row.created_at,
  }))
}

export function RequestsDashboard({
  initialRequests,
  staffId,
}: {
  initialRequests: StaffRequest[]
  staffId: string
}) {
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('requests-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async () => {
        setRequests(await fetchOpenRequests())
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function updateStatus(id: string, status: 'acknowledged' | 'resolved') {
    const supabase = createClient()
    const patch: { status: string; resolved_at?: string; handled_by: string } = { status, handled_by: staffId }
    if (status === 'resolved') {
      patch.resolved_at = new Date().toISOString()
    }

    const { error } = await supabase.from('requests').update(patch).eq('id', id)

    if (error) {
      console.error('Failed to update request:', error.message)
      return
    }

    setRequests((current) =>
      status === 'resolved'
        ? current.filter((request) => request.id !== id)
        : current.map((request) => (request.id === id ? { ...request, status } : request))
    )
  }

  if (requests.length === 0) {
    return <p className="text-gray-500">Καμία εκκρεμής ειδοποίηση.</p>
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex items-center justify-between rounded border border-gray-200 p-4"
        >
          <div>
            <p className="font-medium text-gray-900">
              Τραπέζι {request.tableLabel} — {TYPE_LABELS[request.type]}
            </p>
            <p className="text-sm text-gray-500">
              {STATUS_LABELS[request.status]} ·{' '}
              {new Date(request.createdAt).toLocaleTimeString('el-GR')}
            </p>
          </div>
          <div className="flex gap-2">
            {request.status === 'pending' && (
              <button
                onClick={() => updateStatus(request.id, 'acknowledged')}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                Ανέλαβα
              </button>
            )}
            <button
              onClick={() => updateStatus(request.id, 'resolved')}
              className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
            >
              Ολοκληρώθηκε
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
