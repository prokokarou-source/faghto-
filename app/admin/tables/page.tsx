import QRCode from 'qrcode'
import { getStaffRole } from '@/lib/auth/get-staff-role'
import { createClient } from '@/lib/supabase/server'
import { createTable, deleteTable } from '@/lib/admin/table-actions'

export const dynamic = 'force-dynamic'

export default async function AdminTablesPage() {
  const staff = await getStaffRole()
  if (!staff) return null

  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('slug')
    .eq('id', staff.restaurantId)
    .single()

  const { data: tables } = await supabase
    .from('tables')
    .select('id, label, qr_token')
    .eq('restaurant_id', staff.restaurantId)
    .order('label')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const tablesWithQr = await Promise.all(
    (tables ?? []).map(async (table) => {
      const menuUrl = `${baseUrl}/menu/${restaurant?.slug}?table=${table.qr_token}`
      const qrDataUrl = await QRCode.toDataURL(menuUrl, { width: 200 })
      return { ...table, menuUrl, qrDataUrl }
    })
  )

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Διαχείριση τραπεζιών</h1>

      <form action={createTable} className="mt-6 flex gap-2">
        <input type="hidden" name="restaurantId" value={staff.restaurantId} />
        <input
          name="label"
          placeholder="Αριθμός τραπεζιού (π.χ. 14)"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Προσθήκη τραπεζιού
        </button>
      </form>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {tablesWithQr.map((table) => (
          <div key={table.id} className="rounded border border-gray-200 p-4 text-center">
            <p className="font-medium text-gray-900">Τραπέζι {table.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={table.qrDataUrl} alt={`QR code για το τραπέζι ${table.label}`} className="mx-auto mt-2" />
            <p className="mt-2 break-all text-xs text-gray-400">{table.menuUrl}</p>
            <form action={deleteTable} className="mt-2">
              <input type="hidden" name="id" value={table.id} />
              <button type="submit" className="text-sm text-red-600">
                Διαγραφή
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  )
}
