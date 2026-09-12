import { teachesCourse } from '@/features/courses'
import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { Card, Empty, MetricCard, Screen, Stars } from '@/components/ui/ui'
import { courseService } from '@/features/courses'
import { reviewService } from '@/features/reviews'
import { useApp } from '@/providers/AppProvider'
import type { Course, Review } from '@/types'
import { TeacherHeader } from '@/components/teacher/TeacherHeader'

export default function TeacherInsights() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  useEffect(() => {
    if (!profile) return
    void courseService.courses().then(all => {
      const assigned = all.filter(course => teachesCourse(course, profile))
      setCourses(assigned)
      return Promise.all(assigned.map(course => reviewService.reviews(course.id)))
    }).then(groups => setReviews(groups.flat())).catch(() => { setCourses([]); setReviews([]) })
  }, [profile])
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, value) => total + value, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0
  return <Screen><View className="px-5 pt-3"><TeacherHeader title="Teaching insights" subtitle="Understand course performance and student engagement." /><View className="mt-6 flex-row flex-wrap gap-3"><MetricCard label="Courses" value={courses.length} /><MetricCard label="Reviews" value={reviews.length} /><MetricCard label="Average rating" value={reviews.length ? `${average.toFixed(1)} / 5` : 'No data'} /></View>{reviews.length ? <Card className="mt-6"><Text className="font-semibold text-ink dark:text-white">Feedback trend</Text><Text className="mt-2 text-sm leading-5 text-muted">Your students have submitted {reviews.length} review{reviews.length === 1 ? '' : 's'} across your assigned courses.</Text><View className="mt-3"><Stars value={average} /></View></Card> : <Empty title="No insights yet" body="Insights will appear after students submit feedback." />}</View></Screen>
}
