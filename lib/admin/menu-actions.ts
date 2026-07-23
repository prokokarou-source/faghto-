'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(formData: FormData) {
  const restaurantId = String(formData.get('restaurantId'))
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const supabase = await createClient()
  await supabase.from('menu_categories').insert({ restaurant_id: restaurantId, name, sort_order: 0 })
  revalidatePath('/admin/menu')
}

export async function deleteCategory(formData: FormData) {
  const id = String(formData.get('id'))
  const supabase = await createClient()
  await supabase.from('menu_categories').delete().eq('id', id)
  revalidatePath('/admin/menu')
}

export async function createItem(formData: FormData) {
  const categoryId = String(formData.get('categoryId'))
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const price = Number(formData.get('price'))
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  if (!name || Number.isNaN(price)) return

  const supabase = await createClient()
  await supabase.from('menu_items').insert({
    category_id: categoryId,
    name,
    description: description || null,
    price,
    tags,
  })
  revalidatePath('/admin/menu')
}

export async function updateItem(formData: FormData) {
  const id = String(formData.get('id'))
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const price = Number(formData.get('price'))
  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  if (!name || Number.isNaN(price)) return

  const supabase = await createClient()
  await supabase
    .from('menu_items')
    .update({ name, description: description || null, price, tags })
    .eq('id', id)
  revalidatePath('/admin/menu')
}

export async function toggleItemAvailability(formData: FormData) {
  const id = String(formData.get('id'))
  const available = formData.get('available') === 'true'

  const supabase = await createClient()
  await supabase.from('menu_items').update({ available: !available }).eq('id', id)
  revalidatePath('/admin/menu')
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get('id'))
  const supabase = await createClient()
  await supabase.from('menu_items').delete().eq('id', id)
  revalidatePath('/admin/menu')
}
