import { useCallback, useState } from 'react'
import type { Review } from '@/lib/types/types'
import { reviewService } from '@/services/reviewService'
export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const loadForCourse = useCallback(async (courseId: string) => { setLoading(true); try { const next = await reviewService.reviews(courseId); setReviews(next); return next } finally { setLoading(false) } }, [])
  return { reviews, loading, loadForCourse }
}
