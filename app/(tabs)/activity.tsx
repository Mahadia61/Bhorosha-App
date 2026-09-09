import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { ActivityItem, AppNotification, Course, Professor, ProfessorReview, Review } from '@/lib/types'

type ActivityTab = 'all' | 'reviews' | 'questions' | 'replies'
type ListItem = { id: string; kind: 'courseReview' | 'professorReview' | 'question' | 'answer'; title: string; related: string; date: number; targetId: string; courseId?: string; professorId?: string; questionId?: string; anonymous?: boolean; preview?: string; status?: string }

const tabs: { key: ActivityTab; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'reviews', label: 'My Reviews' }, { key: 'questions', label: 'My Questions' }, { key: 'replies', label: 'Replies' },
]

export default function Activity() {
  const { profile, isDark } = useApp()
  const [tab, setTab] = useState<ActivityTab>('all')
  const [items, setItems] = useState<ActivityItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [teacherReviews, setTeacherReviews] = useState<ProfessorReview[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Professor[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    setRefreshing(true); setError('')
    try {
      const [activity, nextNotifications, nextCourses, nextTeachers, nextReviews, nextTeacherReviews] = await Promise.all([
        services.myActivity(profile.id), services.questionNotifications(profile.id), services.courses(), services.professors(), services.myReviews(profile.id), services.myProfessorReviews(profile.id),
      ])
      setItems(activity); setNotifications(nextNotifications); setCourses(nextCourses); setTeachers(nextTeachers); setReviews(nextReviews); setTeacherReviews(nextTeacherReviews)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your activity.')
    } finally { setRefreshing(false) }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const courseById = useMemo(() => new Map(courses.map(course => [course.id, course])), [courses])
  const teacherById = useMemo(() => new Map(teachers.map(teacher => [teacher.id, teacher])), [teachers])
  const reviewById = useMemo(() => new Map(reviews.map(review => [review.id, review])), [reviews])
  const teacherReviewById = useMemo(() => new Map(teacherReviews.map(review => [review.id, review])), [teacherReviews])
  const activityItems = useMemo(() => {
    const submitted = items.map(item => {
      const course = item.courseId ? courseById.get(item.courseId) : undefined
      const teacher = item.professorId ? teacherById.get(item.professorId) : undefined
      return { id: item.id, kind: item.kind, title: item.kind === 'courseReview' ? 'You submitted a course review' : item.kind === 'professorReview' ? 'You submitted a teacher review' : 'You asked a question', related: teacher?.name ?? course?.code ?? 'Bhorosha community', date: item.createdAt, targetId: item.targetId, courseId: item.courseId, professorId: item.professorId, questionId: item.questionId, preview: item.text } as ListItem
    })
    const replies = notifications.map(notification => ({ id: notification.id, kind: 'answer' as const, title: notification.title || 'Teacher replied to your question', related: courseById.get(notification.courseId ?? '')?.code ?? 'Course question', date: notification.createdAt, targetId: notification.id, courseId: notification.courseId, professorId: undefined, questionId: notification.questionId, preview: notification.body }))
    return [...submitted, ...replies].sort((a, b) => b.date - a.date)
  }, [items, notifications, courseById, teacherById])
  const visible = activityItems.filter(item => tab === 'all' || (tab === 'reviews' && (item.kind === 'courseReview' || item.kind === 'professorReview')) || (tab === 'questions' && item.kind === 'question') || (tab === 'replies' && item.kind === 'answer'))
  const reviewItems: ListItem[] = [...reviews.map(review => ({ id: review.id, kind: 'courseReview' as const, title: courseById.get(review.courseId)?.title ?? 'Course review', related: courseById.get(review.courseId)?.code ?? 'Course', date: review.createdAt, targetId: review.id, courseId: review.courseId, anonymous: review.anonymous, preview: review.text })), ...teacherReviews.map(review => ({ id: review.id, kind: 'professorReview' as const, title: teacherById.get(review.professorId)?.name ?? 'Teacher review', related: 'Teacher review', date: review.createdAt, targetId: review.id, professorId: review.professorId, anonymous: review.anonymous, preview: review.text }))].sort((a, b) => b.date - a.date)
  const questionItems = items.filter(item => item.kind === 'question').map(item => ({ id: item.id, kind: 'question' as const, title: 'My Question', related: courseById.get(item.courseId ?? '')?.code ?? 'Course question', date: item.createdAt, targetId: item.targetId, courseId: item.courseId, questionId: item.questionId, preview: item.text, status: notifications.some(notification => notification.questionId === item.targetId) ? 'Answered' : 'Awaiting' }))
  const data = tab === 'reviews' ? reviewItems : tab === 'questions' ? questionItems : visible

  return <Screen>
    <FlatList
      data={data}
      keyExtractor={item => `${item.kind}-${item.id}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 }}
      ListHeaderComponent={<>
        <View className="flex-row items-start justify-between"><View><Text className="text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">Activity</Text><Text className="mt-1 text-xs text-[#64718B] dark:text-slate-400">Track your interactions</Text></View><View className="flex-row items-center gap-3"><Pressable onPress={() => router.push('/student-notifications' as never)}><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable><Pressable onPress={() => router.push('/(tabs)/profile' as never)} className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable></View></View>
        <View className="mt-5 flex-row gap-2">{tabs.map(item => <Pressable key={item.key} onPress={() => setTab(item.key)} className={`rounded-lg px-3 py-2 ${tab === item.key ? 'bg-brand' : 'bg-white dark:bg-slate-900'}`}><Text className={`text-[10px] font-semibold ${tab === item.key ? 'text-white' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View>
        <Text className="mb-1 mt-6 text-sm font-extrabold text-[#172038] dark:text-white">{tab === 'all' ? 'Recent Activity' : tab === 'reviews' ? 'My Reviews' : tab === 'questions' ? 'My Questions' : 'Replies to You'}</Text>
        {error ? <Text className="mb-2 text-xs text-rose-600">{error}</Text> : null}
      </>}
      ListEmptyComponent={<Empty title="No activity yet" body="Your reviews, questions, and replies will appear here." />}
      renderItem={({ item }) => <ActivityRow item={item} course={courseById.get(item.courseId ?? '')} review={reviewById.get(item.targetId)} teacherReview={teacherReviewById.get(item.targetId)} onPress={() => router.push(`/activity/${item.targetId}?kind=${item.kind}&courseId=${item.courseId ?? ''}&professorId=${item.professorId ?? ''}&questionId=${item.questionId ?? ''}` as never)} />}
    />
  </Screen>
}

function ActivityRow({ item, course, review, teacherReview, onPress }: { item: ListItem; course?: Course; review?: Review; teacherReview?: ProfessorReview; onPress: () => void }) {
  const icon = item.kind === 'courseReview' ? 'message-square' : item.kind === 'professorReview' ? 'star' : item.kind === 'question' ? 'help-circle' : 'corner-up-left'
  const color = item.kind === 'courseReview' ? '#16A34A' : item.kind === 'professorReview' ? '#E11D48' : item.kind === 'question' ? '#7C3AED' : '#1670F8'
  const preview = review?.text ?? teacherReview?.text ?? item.preview ?? ''
  return <Pressable onPress={onPress} className="flex-row items-center border-b border-slate-100 py-4 dark:border-slate-800"><View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${color}18` }}><Feather name={icon} size={18} color={color} /></View><View className="ml-3 flex-1"><Text className="text-xs font-bold text-[#172038] dark:text-white">{item.title}</Text><Text numberOfLines={1} className="mt-1 text-[10px] text-muted">{item.related}{course ? ` — ${course.title}` : ''}</Text>{preview ? <Text numberOfLines={1} className="mt-1 text-[10px] text-muted">{preview}</Text> : null}<Text className="mt-1 text-[10px] text-muted">{new Date(item.date).toLocaleDateString()}</Text></View><Feather name="chevron-right" size={16} color="#64718B" /></Pressable>
}
