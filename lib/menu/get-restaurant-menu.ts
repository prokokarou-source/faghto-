import { createClient } from '@/lib/supabase/server'
import type { MenuItem } from '@/lib/menu/filter-items'

export type MenuCategory = {
  id: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

export type RestaurantMenu = {
  restaurant: { id: string; name: string; slug: string }
  categories: MenuCategory[]
}

export async function getRestaurantMenu(slug: string): Promise<RestaurantMenu | null> {
  const supabase = await createClient()

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (restaurantError || !restaurant) return null

  const { data: categories, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order')

  if (categoriesError || !categories || categories.length === 0) {
    return { restaurant, categories: [] }
  }

  const categoryIds = categories.map((category) => category.id)

  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, price, tags, available')
    .in('category_id', categoryIds)
    .eq('available', true)

  if (itemsError || !items) {
    return {
      restaurant,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
        items: [],
      })),
    }
  }

  return {
    restaurant,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      items: items
        .filter((item) => item.category_id === category.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          tags: item.tags ?? [],
          available: item.available,
        })),
    })),
  }
}
