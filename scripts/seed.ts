import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceRoleKey)

async function seed() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({ name: 'Demo Taverna', slug: 'demo-taverna' })
    .select()
    .single()

  if (restaurantError) throw restaurantError
  console.log('Created restaurant:', restaurant.id)

  const staffAccounts = [
    { email: 'admin@demo-taverna.test', password: 'password123', role: 'admin' as const },
    { email: 'waiter@demo-taverna.test', password: 'password123', role: 'waiter' as const },
  ]

  for (const account of staffAccounts) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    })

    if (authError) throw authError

    const { error: staffError } = await supabase.from('staff').insert({
      restaurant_id: restaurant.id,
      auth_user_id: authUser.user.id,
      role: account.role,
    })

    if (staffError) throw staffError
    console.log(`Created ${account.role}:`, account.email)
  }
}

seed()
  .then(() => {
    console.log('Seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
