import { describe, expect, it } from 'vitest'
import { isProtectedPath } from './protected-paths'

describe('isProtectedPath', () => {
  it('returns true for /staff and nested paths', () => {
    expect(isProtectedPath('/staff')).toBe(true)
    expect(isProtectedPath('/staff/orders')).toBe(true)
  })

  it('returns true for /admin and nested paths', () => {
    expect(isProtectedPath('/admin')).toBe(true)
    expect(isProtectedPath('/admin/menu')).toBe(true)
  })

  it('returns false for public paths', () => {
    expect(isProtectedPath('/')).toBe(false)
    expect(isProtectedPath('/login')).toBe(false)
    expect(isProtectedPath('/menu/demo-taverna')).toBe(false)
  })
})
