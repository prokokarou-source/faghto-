import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceRoleKey)

async function reseed() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'demo-taverna')
    .single()

  if (restaurantError || !restaurant) {
    throw new Error('demo-taverna restaurant not found — run `npm run seed` first')
  }

  await supabase.from('menu_categories').delete().eq('restaurant_id', restaurant.id)

  const categories = [
    { name: 'Καφέδες', sort_order: 0 },
    { name: 'Πρωινό & Brunch', sort_order: 1 },
    { name: 'Χυμοί & Smoothies', sort_order: 2 },
    { name: 'Γλυκά', sort_order: 3 },
  ]

  const { data: inserted, error: catError } = await supabase
    .from('menu_categories')
    .insert(categories.map((category) => ({ ...category, restaurant_id: restaurant.id })))
    .select()

  if (catError || !inserted) throw catError

  const byName = Object.fromEntries(inserted.map((category) => [category.name, category.id]))

  const items = [
    { category_id: byName['Καφέδες'], name: 'Espresso', description: null, price: 2.2, tags: [] },
    { category_id: byName['Καφέδες'], name: 'Cappuccino', description: null, price: 3.0, tags: [] },
    { category_id: byName['Καφέδες'], name: 'Flat White', description: null, price: 3.2, tags: [] },
    {
      category_id: byName['Καφέδες'],
      name: 'Iced Latte',
      description: 'Με γάλα βρώμης, προαιρετικά',
      price: 3.5,
      tags: ['vegan'],
    },
    {
      category_id: byName['Πρωινό & Brunch'],
      name: 'Avocado Toast',
      description: 'Σουρωτό γιαούρτι, λεμόνι, chili flakes',
      price: 7.5,
      tags: ['vegetarian'],
    },
    {
      category_id: byName['Πρωινό & Brunch'],
      name: 'Eggs Benedict',
      description: 'Ποσέ αυγά, hollandaise, μπέικον',
      price: 9.8,
      tags: [],
    },
    {
      category_id: byName['Πρωινό & Brunch'],
      name: 'Greek Yogurt Bowl',
      description: 'Μέλι, καρύδια, φρέσκα φρούτα',
      price: 6.0,
      tags: ['vegetarian', 'gluten-free'],
    },
    {
      category_id: byName['Πρωινό & Brunch'],
      name: 'Fluffy Pancakes',
      description: 'Σιρόπι σφενδάμου, φρέσκα μούρα',
      price: 8.2,
      tags: ['vegetarian'],
    },
    {
      category_id: byName['Πρωινό & Brunch'],
      name: 'Spanish Omelette',
      description: 'Πατάτα, κρεμμύδι, φέτα',
      price: 7.8,
      tags: ['vegetarian', 'gluten-free'],
    },
    {
      category_id: byName['Χυμοί & Smoothies'],
      name: 'Fresh Orange Juice',
      description: null,
      price: 4.5,
      tags: ['vegan'],
    },
    {
      category_id: byName['Χυμοί & Smoothies'],
      name: 'Green Smoothie',
      description: 'Σπανάκι, μπανάνα, μήλο, τζίντζερ',
      price: 5.5,
      tags: ['vegan'],
    },
    {
      category_id: byName['Χυμοί & Smoothies'],
      name: 'Berry Smoothie',
      description: 'Φράουλα, βατόμουρο, γιαούρτι',
      price: 5.5,
      tags: ['vegetarian'],
    },
    { category_id: byName['Γλυκά'], name: 'Croissant', description: null, price: 2.8, tags: ['vegetarian'] },
    { category_id: byName['Γλυκά'], name: 'Carrot Cake', description: null, price: 4.2, tags: ['vegetarian'] },
    { category_id: byName['Γλυκά'], name: 'Cinnamon Roll', description: null, price: 3.6, tags: ['vegetarian'] },
  ]

  const { error: itemsError } = await supabase.from('menu_items').insert(items)
  if (itemsError) throw itemsError

  console.log(`Reseeded ${inserted.length} categories, ${items.length} items.`)
}

reseed()
  .then(() => {
    console.log('Reseed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Reseed failed:', err)
    process.exit(1)
  })
