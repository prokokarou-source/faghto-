import { describe, expect, it } from 'vitest'
import { getRedirectPathForRole } from './get-redirect-path'

describe('getRedirectPathForRole', () => {
  it('sends admins to /admin', () => {
    expect(getRedirectPathForRole('admin')).toBe('/admin')
  })

  it('sends waiters to /staff', () => {
    expect(getRedirectPathForRole('waiter')).toBe('/staff')
  })
})
