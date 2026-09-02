import { useEffect, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Card, Empty, Screen, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, Review } from '@/lib/types'

export default function Activity() {
  const { profile } = useApp()
  const [reviews, setReviews] = useState<Review[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  useEffect(() => { if (profile) { void services.myReviews(profile.id).then(setReviews); void services.courses().then(setCourses) } }, [profile])
  return <Screen><FlatList data={reviews} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    ListHeaderComponent={<><Text className="mt-2 text-2xl font-bold text-ink dark:text-white">My activity</Text><Text className="mt-1 mb-5 text-sm text-muted">Feedback you have shared with the CUET community.</Text></>}
    ListEmptyComponent={<Empty title="No reviews yet" body="Your submitted course reviews will appear here." />}
    renderItem={({ item }) => { const course = courses.find(value => value.id === item.courseId); const score = Object.values(item.ratings).reduce((total, value) => total + value, 0) / 5; return <Card className="mb-3">
      <Text onPress={() => router.push(`/course/${item.courseId}`)} className="text-xs font-bold text-brand">{course?.code ?? 'Course review'}</Text>
      <Text className="mt-1 font-semibold text-ink dark:text-white">{course?.title ?? 'Course feedback'}</Text><View className="mt-3"><Stars value={score} /></View>
      <Text className="mt-3 leading-5 text-muted">{item.text}</Text><Text className="mt-3 text-xs text-muted">{item.anonymous ? 'Anonymous' : 'Named'} · {new Date(item.createdAt).toLocaleDateString()}</Text>
    </Card> }} />
  </Screen>
}
