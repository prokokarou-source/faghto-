'use client'

import { useMemo, useState } from 'react'
import { filterItemsByTags, type MenuItem } from '@/lib/menu/filter-items'

type MenuCategory = {
  id: string
  name: string
  items: MenuItem[]
}

export function MenuBrowser({
  restaurantName,
  tableLabel,
  categories,
}: {
  restaurantName: string
  tableLabel: string | null
  categories: MenuCategory[]
}) {
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    categories.forEach((category) =>
      category.items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)))
    )
    return Array.from(tagSet).sort()
  }, [categories])

  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{restaurantName}</h1>
        {tableLabel && <p className="mt-1 text-sm text-gray-500">Τραπέζι {tableLabel}</p>}
      </header>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selectedTags.includes(tag)
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {categories.map((category) => {
        const items = filterItemsByTags(category.items, selectedTags)
        if (items.length === 0) return null

        return (
          <section key={category.id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">{category.name}</h2>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    {item.tags.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">{item.tags.join(', ')}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-medium text-gray-900">
                    {item.price.toFixed(2)}&nbsp;€
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
