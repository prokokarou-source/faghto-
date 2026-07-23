import { describe, expect, it } from 'vitest'
import { filterItemsByTags, type MenuItem } from './filter-items'

const items: MenuItem[] = [
  { id: '1', name: 'Τζατζίκι', description: null, price: 4.5, tags: ['vegetarian'], available: true },
  { id: '2', name: 'Γεμιστά', description: null, price: 9.5, tags: ['vegetarian', 'vegan'], available: true },
  { id: '3', name: 'Σουβλάκι', description: null, price: 8.5, tags: ['spicy'], available: true },
]

describe('filterItemsByTags', () => {
  it('returns all items when no tags are selected', () => {
    expect(filterItemsByTags(items, [])).toEqual(items)
  })

  it('returns only items matching a single selected tag', () => {
    expect(filterItemsByTags(items, ['spicy'])).toEqual([items[2]])
  })

  it('returns only items matching all selected tags', () => {
    expect(filterItemsByTags(items, ['vegetarian', 'vegan'])).toEqual([items[1]])
  })

  it('returns an empty array when no item matches', () => {
    expect(filterItemsByTags(items, ['gluten-free'])).toEqual([])
  })
})
