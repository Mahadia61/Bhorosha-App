import { FilterChips } from '@/components/ui/ui'

export function CourseFilter<T extends string>({ items, value, onChange }: {
  items: { key: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
}) {
  return <FilterChips items={items} value={value} onChange={onChange} />
}
