import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getAnalytics } from '@/lib/admin/get-analytics'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const staff = await getStaffRole()
  if (!staff) return null

  const analytics = await getAnalytics(staff.restaurantId)

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Πίνακας διαχειριστή</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Κλήσεις σήμερα</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{analytics.requestsToday}</p>
        </div>
        <div className="rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Μέσος χρόνος απόκρισης</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {analytics.averageResolutionMinutes === null
              ? '—'
              : `${analytics.averageResolutionMinutes.toFixed(1)} λεπτά`}
          </p>
        </div>
      </div>
    </main>
  )
}
