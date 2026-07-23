export type StaffRole = 'admin' | 'waiter'

export function getRedirectPathForRole(role: StaffRole): string {
  return role === 'admin' ? '/admin' : '/staff'
}
