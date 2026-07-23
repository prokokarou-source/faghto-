import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceRoleKey)

async function seedMenu() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'demo-taverna')
    .single()

  if (restaurantError || !restaurant) {
    throw new Error('demo-taverna restaurant not found — run `npm run seed` first')
  }

  const categories = [
    { name: 'Ορεκτικά', sort_order: 0 },
    { name: 'Κυρίως Πιάτα', sort_order: 1 },
  ]

  const { data: insertedCategories, error: categoriesError } = await supabase
    .from('menu_categories')
    .insert(categories.map((category) => ({ ...category, restaurant_id: restaurant.id })))
    .select()

  if (categoriesError || !insertedCategories) throw categoriesError

  const [appetizers, mains] = insertedCategories.sort((a, b) => a.sort_order - b.sort_order)

  const items = [
    { category_id: appetizers.id, name: 'Τζατζίκι', description: 'Γιαούρτι, αγγούρι, σκόρδο', price: 4.5, tags: ['vegetarian'] },
    { category_id: appetizers.id, name: 'Ντολμαδάκια', description: 'Αμπελόφυλλα με ρύζι', price: 5.5, tags: ['vegetarian', 'vegan'] },
    { category_id: appetizers.id, name: 'Κεφτεδάκια', description: 'Σπιτικά κεφτεδάκια', price: 6.0, tags: [] },
    { category_id: mains.id, name: 'Μουσακάς', description: 'Παραδοσιακός μουσακάς', price: 11.5, tags: [] },
    { category_id: mains.id, name: 'Γεμιστά', description: 'Ντομάτες και πιπεριές γεμιστές με ρύζι', price: 9.5, tags: ['vegetarian', 'vegan'] },
    { category_id: mains.id, name: 'Σουβλάκι Χοιρινό', description: 'Με πίτα και πατάτες', price: 8.5, tags: ['spicy'] },
  ]

  const { error: itemsError } = await supabase.from('menu_items').insert(items)
  if (itemsError) throw itemsError

  console.log(`Seeded ${insertedCategories.length} categories and ${items.length} items.`)
}

seedMenu()
  .then(() => {
    console.log('Menu seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Menu seed failed:', err)
    process.exit(1)
  })
