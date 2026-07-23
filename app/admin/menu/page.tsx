import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getAdminMenu } from '@/lib/admin/get-admin-menu'
import {
  createCategory,
  deleteCategory,
  createItem,
  updateItem,
  toggleItemAvailability,
  deleteItem,
} from '@/lib/admin/menu-actions'

export const dynamic = 'force-dynamic'

export default async function AdminMenuPage() {
  const staff = await getStaffRole()
  if (!staff) return null

  const categories = await getAdminMenu(staff.restaurantId)

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Διαχείριση μενού</h1>

      <form action={createCategory} className="mt-6 flex gap-2">
        <input type="hidden" name="restaurantId" value={staff.restaurantId} />
        <input
          name="name"
          placeholder="Νέα κατηγορία (π.χ. Επιδόρπια)"
          required
          className="rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          Προσθήκη κατηγορίας
        </button>
      </form>

      {categories.map((category) => (
        <section key={category.id} className="mt-8 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={category.id} />
              <button type="submit" className="text-sm text-red-600">
                Διαγραφή κατηγορίας
              </button>
            </form>
          </div>

          <ul className="mt-4 space-y-3">
            {category.items.map((item) => (
              <li key={item.id} className="rounded border border-gray-100 p-3">
                <form action={updateItem} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={item.id} />
                  <input
                    name="name"
                    defaultValue={item.name}
                    required
                    className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <input
                    name="description"
                    defaultValue={item.description ?? ''}
                    placeholder="Περιγραφή"
                    className="w-56 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={item.price}
                    required
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <input
                    name="tags"
                    defaultValue={item.tags.join(', ')}
                    placeholder="tags (κόμμα)"
                    className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button type="submit" className="rounded border border-gray-300 px-2 py-1 text-sm">
                    Αποθήκευση
                  </button>
                </form>
                <div className="mt-2 flex items-center gap-3">
                  <form action={toggleItemAvailability}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="available" value={String(item.available)} />
                    <button
                      type="submit"
                      className={`rounded px-2 py-1 text-xs ${
                        item.available ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {item.available ? 'Διαθέσιμο' : 'Μη διαθέσιμο'}
                    </button>
                  </form>
                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs text-red-600">
                      Διαγραφή
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>

          <form action={createItem} className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            <input type="hidden" name="categoryId" value={category.id} />
            <input name="name" placeholder="Όνομα πιάτου" required className="w-40 rounded border border-gray-300 px-2 py-1 text-sm" />
            <input name="description" placeholder="Περιγραφή" className="w-56 rounded border border-gray-300 px-2 py-1 text-sm" />
            <input name="price" type="number" step="0.01" placeholder="Τιμή" required className="w-20 rounded border border-gray-300 px-2 py-1 text-sm" />
            <input name="tags" placeholder="tags (κόμμα)" className="w-40 rounded border border-gray-300 px-2 py-1 text-sm" />
            <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-sm text-white">
              Προσθήκη πιάτου
            </button>
          </form>
        </section>
      ))}
    </main>
  )
}
