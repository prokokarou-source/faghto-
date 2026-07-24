import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getRestaurantRequests } from '@/lib/requests/get-restaurant-requests'
import { RequestsDashboard } from '@/components/staff/RequestsDashboard'

export default async function StaffDashboardPage() {
  const staff = await getStaffRole()
  const requests = staff ? await getRestaurantRequests(staff.restaurantId) : []

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Πίνακας σερβιτόρου</h1>
      <div className="mt-6">
        <RequestsDashboard initialRequests={requests} staffId={staff?.id ?? ''} />
      </div>
    </main>
  )
}
