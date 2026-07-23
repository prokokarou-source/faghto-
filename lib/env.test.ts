import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { getSupabaseEnv } from './env'

describe('getSupabaseEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns url and anonKey when both are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'

    expect(getSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key-value',
    })
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })
})
