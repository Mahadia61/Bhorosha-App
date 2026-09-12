import { Text, View } from 'react-native'
import type { Review } from '@/lib/types/types'
import { Card, Stars } from '@/components/ui/ui'

export function ReviewSummary({ reviews }: { reviews: Review[] }) {
  const rating = reviews.length === 0 ? 0 : reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, value) => total + value, 0) / Object.values(review.ratings).length, 0) / reviews.length
  return <Card><View className="flex-row items-center justify-between"><Text className="text-sm font-semibold text-ink dark:text-white">Community rating</Text><Stars value={rating} /></View><Text className="mt-2 text-sm text-muted">{reviews.length} review{reviews.length === 1 ? '' : 's'}</Text></Card>
}
