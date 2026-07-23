export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  tags: string[]
  available: boolean
}

export function filterItemsByTags(items: MenuItem[], selectedTags: string[]): MenuItem[] {
  if (selectedTags.length === 0) return items
  return items.filter((item) => selectedTags.every((tag) => item.tags.includes(tag)))
}
