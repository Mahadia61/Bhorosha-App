import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { Card, Empty, Screen, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, Review } from '@/lib/types'
import { TeacherHeader } from '@/components/TeacherHeader'

export default function TeacherInsights() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  useEffect(() => {
    if (!profile) return
    void services.courses().then(all => {
      const assigned = all.filter(course => course.teacherIds.includes(profile.id))
      setCourses(assigned)
      return Promise.all(assigned.map(course => services.reviews(course.id)))
    }).then(groups => setReviews(groups.flat())).catch(() => { setCourses([]); setReviews([]) })
  }, [profile])
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, value) => total + value, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0
  return <Screen><TeacherHeader title="Teaching insights" /><Text className="mt-1 text-sm text-muted">Understand course performance and student engagement.</Text><View className="mt-6 flex-row flex-wrap gap-3"><Metric label="Courses" value={courses.length} /><Metric label="Reviews" value={reviews.length} /><Metric label="Average rating" value={reviews.length ? `${average.toFixed(1)} / 5` : 'No data'} /></View>{reviews.length ? <Card className="mt-6"><Text className="font-semibold text-ink dark:text-white">Feedback trend</Text><Text className="mt-2 text-sm leading-5 text-muted">Your students have submitted {reviews.length} review{reviews.length === 1 ? '' : 's'} across your assigned courses.</Text><Stars value={average} /></Card> : <Empty title="No insights yet" body="Insights will appear after students submit feedback." />}</Screen>
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card className="min-w-[30%] flex-1"><Text className="text-xs text-muted">{label}</Text><Text className="mt-2 text-xl font-bold text-ink dark:text-white">{value}</Text></Card> }
