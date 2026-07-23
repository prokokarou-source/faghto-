import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/env'
import { RateLimiter } from '@/lib/requests/rate-limit'

const limiter = new RateLimiter(30_000)

const VALID_TYPES = new Set(['call_waiter', 'bill'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { qrToken, type } = (body ?? {}) as { qrToken?: unknown; type?: unknown }

  if (typeof qrToken !== 'string' || !UUID_RE.test(qrToken)) {
    return NextResponse.json({ error: 'Invalid qrToken' }, { status: 400 })
  }

  if (typeof type !== 'string' || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  if (!limiter.attempt(`${qrToken}:${type}`, Date.now())) {
    return NextResponse.json(
      { error: 'Too many requests, please wait a moment' },
      { status: 429 }
    )
  }

  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(url, serviceRoleKey)

  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id')
    .eq('qr_token', qrToken)
    .single()

  if (tableError || !table) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 404 })
  }

  const { error: insertError } = await supabase
    .from('requests')
    .insert({ table_id: table.id, type })

  if (insertError) {
    return NextResponse.json({ error: 'Could not create request' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
