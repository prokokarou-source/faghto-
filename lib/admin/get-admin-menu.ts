import { createClient } from '@/lib/supabase/server'

export type AdminMenuItem = {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  tags: string[]
  available: boolean
}

export type AdminMenuCategory = {
  id: string
  name: string
  sortOrder: number
  items: AdminMenuItem[]
}

export async function getAdminMenu(restaurantId: string): Promise<AdminMenuCategory[]> {
  const supabase = await createClient()

  const { data: categories, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurantId)
    .order('sort_order')

  if (categoriesError || !categories || categories.length === 0) return []

  const categoryIds = categories.map((category) => category.id)

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, price, tags, available')
    .in('category_id', categoryIds)

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sort_order,
    items: (items ?? [])
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        tags: item.tags ?? [],
        available: item.available,
      })),
  }))
}
