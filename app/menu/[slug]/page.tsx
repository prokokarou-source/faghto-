import { notFound } from 'next/navigation'
import { getRestaurantMenu } from '@/lib/menu/get-restaurant-menu'
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

  return (
    <MenuBrowser
      restaurantName={menu.restaurant.name}
      tableLabel={searchParams.table ?? null}
      categories={menu.categories}
    />
  )
}
