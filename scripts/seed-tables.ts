import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceRoleKey)

async function seedTables() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'demo-taverna')
    .single()

  if (restaurantError || !restaurant) {
    throw new Error('demo-taverna restaurant not found — run `npm run seed` first')
  }

  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .insert([
      { restaurant_id: restaurant.id, label: '12' },
      { restaurant_id: restaurant.id, label: '7' },
    ])
    .select('id, label, qr_token')

  if (tablesError || !tables) throw tablesError

  console.log('Created tables:')
  tables.forEach((table) => {
    console.log(`  Τραπέζι ${table.label} -> qr_token: ${table.qr_token}`)
    console.log(`  Menu URL: http://localhost:3000/menu/demo-taverna?table=${table.qr_token}`)
  })
}

seedTables()
  .then(() => {
    console.log('Table seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Table seed failed:', err)
    process.exit(1)
  })
