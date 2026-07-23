'use client'

import { useMemo, useState } from 'react'
import { filterItemsByTags, type MenuItem } from '@/lib/menu/filter-items'
import { RequestButtons } from '@/components/menu/RequestButtons'

type MenuCategory = {
  id: string
  name: string
  items: MenuItem[]
}

export function MenuBrowser({
  restaurantName,
  tableLabel,
  qrToken,
  categories,
}: {
  restaurantName: string
  tableLabel: string | null
  qrToken: string | null
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
    <main className="mx-auto max-w-lg bg-cream p-6 pb-28 font-serif">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-semibold text-ink">{restaurantName}</h1>
        {tableLabel && (
          <p className="mt-1 text-xs uppercase tracking-widest text-terracotta">
            Τραπέζι {tableLabel}
          </p>
        )}
      </header>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-xs ${
                selectedTags.includes(tag)
                  ? 'border-terracotta bg-terracotta text-white'
                  : 'border-gray-300 text-gray-500'
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
          <section key={category.id} className="mb-6">
            <h2 className="mb-3 border-b-2 border-sand pb-2 text-xs font-bold uppercase tracking-widest text-terracotta">
              {category.name}
            </h2>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 border-b border-sand py-3.5">
                  <div>
                    <p className="text-base font-semibold text-ink">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>
                    )}
                    {item.tags.length > 0 && (
                      <p className="mt-1 text-xs text-terracotta">{item.tags.join(', ')}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-bold text-ink">
                    {item.price.toFixed(2)}&nbsp;€
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {qrToken && <RequestButtons qrToken={qrToken} />}
    </main>
  )
}
