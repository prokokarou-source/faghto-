import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Faghto</h1>
        <p className="mt-2 text-gray-600">QR menu &amp; table service platform</p>
        <Link href="/login" className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-white">
          Σύνδεση προσωπικού
        </Link>
      </div>
    </main>
  )
}
