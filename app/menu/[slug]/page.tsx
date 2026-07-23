import { notFound } from 'next/navigation'
import { getRestaurantMenu } from '@/lib/menu/get-restaurant-menu'
import { getTableByQrToken } from '@/lib/requests/get-table-by-qr-token'
import { MenuBrowser } from '@/components/menu/MenuBrowser'

export const dynamic = 'force-dynamic'

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { table?: string }
}) {
  const menu = await getRestaurantMenu(params.slug)

  if (!menu) {
    notFound()
  }

  const table = searchParams.table
    ? await getTableByQrToken(searchParams.table, menu.restaurant.id)
    : null

  return (
    <MenuBrowser
      restaurantName={menu.restaurant.name}
      tableLabel={table?.label ?? null}
      qrToken={table ? searchParams.table! : null}
      categories={menu.categories}
    />
  )
}
