import { describe, expect, it } from 'vitest'
import { RateLimiter } from './rate-limit'

describe('RateLimiter', () => {
  it('allows the first attempt for a key', () => {
    const limiter = new RateLimiter(30_000)
    expect(limiter.attempt('table-1:call_waiter', 1000)).toBe(true)
  })

  it('denies a second attempt within the window', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:call_waiter', 1000 + 10_000)).toBe(false)
  })

  it('allows a second attempt after the window passes', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:call_waiter', 1000 + 30_001)).toBe(true)
  })

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:bill', 1000)).toBe(true)
  })
})
