export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/staff') || pathname.startsWith('/admin')
}
