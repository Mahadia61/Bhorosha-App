import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'
import { services } from '@/lib/services'
import { academicLabel } from '@/lib/academic'
import type { ActivityItem, AppNotification, Course } from '@/lib/types'

export default function StudentHome() {
  const { profile, isDark } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [ratings, setRatings] = useState<Record<string, { average: number; count: number }>>({})
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    setRefreshing(true)
    setError('')
    try {
      const departmentCourses = (await services.courses()).filter(course => course.department === profile.department)
      const [nextActivity, nextNotifications, summaries] = await Promise.all([
        services.myActivity(profile.id),
        services.questionNotifications(profile.id),
        Promise.all(departmentCourses.map(async course => {
          const reviews = await services.reviews(course.id)
          const average = reviews.length
            ? reviews.reduce((total, review) => total + Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length, 0) / reviews.length
            : 0
          return [course.id, { average, count: reviews.length }] as const
        })),
      ])
      setCourses(departmentCourses)
      setActivity(nextActivity)
      setNotifications(nextNotifications)
      setRatings(Object.fromEntries(summaries))
    } catch (reason) {
      setCourses([])
      setActivity([])
      setNotifications([])
      setRatings({})
      setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.')
    } finally {
      setRefreshing(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const popularCourses = useMemo(() => courses.slice().sort((left, right) => (ratings[right.id]?.count ?? 0) - (ratings[left.id]?.count ?? 0)).slice(0, 3), [courses, ratings])
  const recentCourses = useMemo(() => courses.slice(0, 3), [courses])
  const openCourse = (id: string) => router.push(`/course/${id}`)

  if (!profile) return null

  return <Screen>
    <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View className="mt-3 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm text-slate-500 dark:text-slate-400">Welcome back,</Text>
          <Text className="mt-1 text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">{profile.name}</Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">{profile.department} · {academicLabel(profile.currentLevel ?? null, profile.currentTerm ?? null)}</Text>
        </View>
        <View className="flex-row gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/student-notifications' as never)} className="relative h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Feather name="bell" size={21} color={isDark ? '#E2E8F0' : '#111318'} />
            {notifications.filter(item => !item.read).length ? <View className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 py-0.5"><Text className="text-center text-[10px] font-bold text-white">{notifications.filter(item => !item.read).length}</Text></View> : null}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open student profile" onPress={() => router.push('/(tabs)/profile')} className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800">
            <Text className="text-xl font-bold text-brand">{profile.name.trim().charAt(0).toUpperCase() || 'S'}</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-7 overflow-hidden rounded-3xl bg-blue-100 p-5 dark:bg-slate-900">
        <Text className="text-xl font-bold text-slate-950 dark:text-white">Your voice builds a better campus</Text>
        <Text className="mt-2 max-w-[78%] text-sm leading-5 text-slate-600 dark:text-slate-300">Share your course experience, ask questions and help others.</Text>
        <View className="absolute bottom-5 right-7 h-16 w-16 items-center justify-center rounded-2xl bg-blue-600"><Feather name="message-circle" size={29} color="white" /></View>
      </View>

      <Text className="mt-7 text-lg font-extrabold text-[#10182F] dark:text-white">Quick actions</Text>
      <View className="mt-3 flex-row flex-wrap gap-3">
        <QuickAction icon="book-open" label="My Courses" detail="View enrolled courses" route="/(student-tabs)/courses" />
        <QuickAction icon="message-circle" label="Give Feedback" detail="Share your experience" route="/(student-tabs)/courses" />
        <QuickAction icon="help-circle" label="Ask a Question" detail="Get answers from teachers" route="/(student-tabs)/courses" />
        <QuickAction icon="compass" label="Explore Courses" detail="Discover new courses" route="/(student-tabs)/courses" />
      </View>

      <SectionHeader title="Popular Courses" onPress={() => router.push('/(student-tabs)/courses')} />
      {popularCourses.length ? <View className="flex-row gap-3">{popularCourses.map(course => <CourseCard key={course.id} course={course} rating={ratings[course.id]} onPress={() => openCourse(course.id)} />)}</View> : <Empty title={error ? 'Unable to load courses' : 'No courses found'} body={error || 'Courses for your department will appear here.'} />}

      <SectionHeader title="Recently Added Courses" onPress={() => router.push('/(student-tabs)/courses')} />
      <View className="flex-row gap-3">{recentCourses.map(course => <CourseCard key={course.id} course={course} rating={ratings[course.id]} onPress={() => openCourse(course.id)} />)}</View>

      <SectionHeader title="Recent Activity" onPress={() => router.push('/(student-tabs)/activity')} />
      <Card className="p-0">{activity.slice(0, 3).map((item, index) => <Pressable key={item.id} onPress={() => item.courseId && openCourse(item.courseId)} className={`flex-row items-center gap-3 px-4 py-4 ${index ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}><View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800"><Feather name={item.kind === 'question' || item.kind === 'answer' ? 'message-circle' : item.kind === 'courseReview' ? 'file-text' : 'star'} size={18} color="#1670F8" /></View><View className="flex-1"><Text className="text-sm font-bold text-slate-950 dark:text-white">{activityTitle(item)}</Text><Text numberOfLines={1} className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.text}</Text></View><Text className="text-xs text-slate-500 dark:text-slate-400">{relativeTime(item.createdAt)}</Text></Pressable>)}{!activity.length ? <Text className="px-4 py-5 text-sm text-muted">Your reviews, questions, and replies will appear here.</Text> : null}</Card>
    </ScrollView>
  </Screen>
}

function QuickAction({ icon, label, detail, route }: { icon: keyof typeof Feather.glyphMap; label: string; detail: string; route: string }) {
  return <Pressable onPress={() => router.push(route as never)} className="w-[47%] rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800"><Feather name={icon} size={20} color="#1670F8" /></View><Text className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{label}</Text><Text className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{detail}</Text></Pressable>
}

function SectionHeader({ title, onPress }: { title: string; onPress: () => void }) {
  return <View className="mt-7 flex-row items-center justify-between"><Text className="text-lg font-extrabold text-[#10182F] dark:text-white">{title}</Text><Text onPress={onPress} className="text-sm font-bold text-[#1670F8]">See all</Text></View>
}

function CourseCard({ course, rating, onPress }: { course: Course; rating?: { average: number; count: number }; onPress: () => void }) {
  return <Pressable onPress={onPress} className="min-h-[126px] flex-1 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><Text className="text-xs font-extrabold text-brand">{course.code}</Text><Text numberOfLines={2} className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{course.title}</Text><Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">{academicLabel(course.level, course.term)}</Text><View className="mt-2 flex-row items-center gap-1"><Feather name="star" size={12} color="#E0A106" /><Text className="text-[10px] text-slate-500">{rating?.count ?? 0} reviews</Text></View></Pressable>
}

function activityTitle(item: ActivityItem) {
  return item.kind === 'answer' ? 'Teacher replied to your question' : item.kind === 'courseReview' ? 'Your review was posted' : item.kind === 'question' ? 'Question submitted' : 'Teacher review submitted'
}

function relativeTime(timestamp: number) {
  const hours = Math.floor((Date.now() - timestamp) / 3600000)
  if (hours < 1) return 'Now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
