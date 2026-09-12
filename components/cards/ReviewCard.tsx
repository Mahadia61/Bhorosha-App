import { Text, View } from 'react-native'
import type { Review } from '@/lib/types/types'
import { Card, Stars } from '@/components/ui/ui'
export function ReviewCard({ review }: { review: Review }) {
  const rating = Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length
  return <Card><View className="flex-row items-center justify-between"><Text className="font-semibold text-ink dark:text-white">{review.displayName ?? 'Anonymous student'}</Text><Stars value={rating} /></View><Text className="mt-3 text-sm leading-5 text-muted">{review.text}</Text></Card>
}
