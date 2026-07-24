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

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Ανά σερβιτόρο</h2>
        {analytics.byStaff.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Δεν υπάρχει ακόμα προσωπικό.</p>
        ) : (
          <table className="mt-3 w-full max-w-2xl text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 font-medium">Όνομα</th>
                <th className="py-2 font-medium">Ρόλος</th>
                <th className="py-2 font-medium">Κλήσεις που ολοκλήρωσε</th>
                <th className="py-2 font-medium">Μέσος χρόνος</th>
              </tr>
            </thead>
            <tbody>
              {analytics.byStaff.map((stat) => (
                <tr key={stat.staffId} className="border-t border-gray-200">
                  <td className="py-2 text-gray-900">{stat.displayName}</td>
                  <td className="py-2 text-gray-600">
                    {stat.role === 'admin' ? 'Διαχειριστής' : 'Σερβιτόρος'}
                  </td>
                  <td className="py-2 text-gray-900">{stat.handledCount}</td>
                  <td className="py-2 text-gray-900">
                    {stat.averageResolutionMinutes === null
                      ? '—'
                      : `${stat.averageResolutionMinutes.toFixed(1)} λεπτά`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
