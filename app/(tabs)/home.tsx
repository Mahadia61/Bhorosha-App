import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen, Stars } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'
import { services } from '@/lib/services'
import type { Course } from '@/lib/types'
import { academicLabel } from '@/lib/academic'

export default function Home() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [ratingSummary, setRatingSummary] = useState<Record<string, { average: number; count: number }>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const load = async () => { setRefreshing(true); setError(''); try { const nextCourses = await services.courses(); setCourses(nextCourses); if (profile?.role === 'student') { const departmentCourses = nextCourses.filter(course => course.department === profile.department); const summaries = await Promise.all(departmentCourses.map(async course => { const reviews = await services.reviews(course.id); const average = reviews.length ? reviews.reduce((total, review) => total + Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0; return [course.id, { average, count: reviews.length }] as const })); setRatingSummary(Object.fromEntries(summaries)) } } catch (reason) { setCourses([]); setRatingSummary({}); setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') } finally { setRefreshing(false) } }
  useEffect(() => { void load() }, [profile?.role])
  const isTeacher = profile?.role === 'teacher'
  const visibleCourses = useMemo(() => {
    if (isTeacher) return courses.filter(course => course.teacherIds.includes(profile?.id ?? ''))
    return courses.filter(course => course.department === profile?.department).slice(0, 3)
  }, [courses, isTeacher, profile?.department, profile?.id])

  return <Screen><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    <Text className="mt-6 text-sm text-muted">{isTeacher ? 'Teacher dashboard' : 'Welcome back,'}</Text>
    <Text className="text-3xl font-bold text-ink dark:text-white">{profile?.name ?? 'CUET Member'}</Text>{!isTeacher && profile?.currentLevel && profile.currentTerm ? <Text className="mt-1 text-sm text-muted">{profile.department} · {academicLabel(profile.currentLevel, profile.currentTerm)}</Text> : null}
    <Card className="mt-6 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900"><View className="flex-row gap-3">
      <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand"><Feather name={isTeacher ? 'bar-chart-2' : 'shield'} size={21} color="white" /></View>
      <View className="flex-1"><Text className="font-semibold text-ink dark:text-white">{isTeacher ? 'Feedback, without identities' : 'Your voice is protected'}</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">{isTeacher ? 'Review authors are protected. Use trends to improve each course experience.' : 'Reviews are anonymous by default. Teachers only see constructive, aggregated feedback.'}</Text>
      </View>
    </View></Card>
    <View className="mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-ink dark:text-white">{isTeacher ? 'Your assigned courses' : `Popular in ${profile?.department || 'your department'}`}</Text>
      {!isTeacher && <Text onPress={() => router.push('/(student-tabs)/courses')} className="text-sm font-semibold text-brand">See all</Text>}
    </View>
    {visibleCourses.length ? visibleCourses.map(course => <Card key={course.id} className="mt-3">
      <Text onPress={() => router.push(`/course/${course.id}`)} className="text-xs font-bold text-brand">{course.code}</Text>
      <Text onPress={() => router.push(`/course/${course.id}`)} className="mt-1 text-base font-semibold text-ink dark:text-white">{course.title}</Text>
      <Text className="mt-1 text-sm text-muted">{isTeacher ? `${academicLabel(course.level, course.term)} · ${course.credits} credits` : `${course.teacherNames.join(', ')} · ${academicLabel(course.level, course.term)}`}</Text>
      {!isTeacher && <View className="mt-3 flex-row items-center gap-2"><Stars value={ratingSummary[course.id]?.average ?? 0} /><Text className="text-xs text-muted">{ratingSummary[course.id]?.count ? `${ratingSummary[course.id].count} community review${ratingSummary[course.id].count === 1 ? '' : 's'}` : 'No community reviews yet'}</Text></View>}
    </Card>) : <Empty title={error ? 'Unable to load courses' : 'No assigned courses'} body={error || 'Courses assigned to you will appear here.'} />}
    {isTeacher ? <View className="mt-6 flex-row gap-3"><Text onPress={() => router.push('/(teacher-tabs)/feedback')} className="flex-1 rounded-xl bg-brand px-3 py-3 text-center text-sm font-semibold text-white">View feedback</Text><Text onPress={() => router.push('/(teacher-tabs)/questions')} className="flex-1 rounded-xl border border-slate-300 px-3 py-3 text-center text-sm font-semibold text-ink dark:border-slate-700 dark:text-white">Course Q&A</Text></View> : <Card className="mt-6"><View className="flex-row items-center gap-3"><Feather name="message-circle" size={21} color="#4F7EF7" /><View className="flex-1"><Text className="font-semibold text-ink dark:text-white">Share helpful feedback</Text><Text className="mt-1 text-sm text-muted">Choose a course, add ratings, and decide whether your name stays hidden.</Text></View></View></Card>}
  </ScrollView></Screen>
}
