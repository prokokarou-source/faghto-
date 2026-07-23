import Link from 'next/link'

const LINKS = [
  { href: '/admin', label: 'Επισκόπηση' },
  { href: '/admin/menu', label: 'Μενού' },
  { href: '/admin/tables', label: 'Τραπέζια' },
  { href: '/admin/staff', label: 'Προσωπικό' },
]

export function AdminNav() {
  return (
    <nav className="flex gap-4 border-b border-gray-200 px-8 py-3">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="text-sm text-gray-700 hover:text-gray-900">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
