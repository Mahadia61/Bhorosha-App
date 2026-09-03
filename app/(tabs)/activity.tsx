import { useEffect, useMemo, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { ActivityItem, AppNotification, Course, Professor } from '@/lib/types'

const labels: Record<ActivityItem['kind'], string> = {
  courseReview: 'Course review', professorReview: 'Teacher review', question: 'Course question', answer: 'Answer',
}

export default function Activity() {
  const { profile } = useApp()
  const [items, setItems] = useState<ActivityItem[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<Professor[]>([])

  useEffect(() => {
    if (!profile) return
    void Promise.all([services.myActivity(profile.id), services.questionNotifications(profile.id), services.courses(), services.professors()]).then(([activity, nextNotifications, nextCourses, nextTeachers]) => {
      setItems(activity); setNotifications(nextNotifications); setCourses(nextCourses); setTeachers(nextTeachers)
    })
  }, [profile])

  const courseById = useMemo(() => new Map(courses.map(course => [course.id, course])), [courses])
  const teacherById = useMemo(() => new Map(teachers.map(teacher => [teacher.id, teacher])), [teachers])

  return <Screen><FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
    ListHeaderComponent={<><Text className="mt-2 text-2xl font-bold text-ink dark:text-white">My activity</Text><Text className="mt-1 text-sm text-muted">Your reviews, questions, and answers stay organized here.</Text>{notifications.length ? <><Text className="mt-6 text-lg font-bold text-ink dark:text-white">New responses</Text>{notifications.map(notification => <Card key={notification.id} className={`mt-3 border-blue-100 bg-blue-50 dark:border-slate-700 dark:bg-slate-900 ${notification.read ? 'opacity-75' : ''}`}><Text className="text-xs font-bold text-brand">TEACHER RESPONSE</Text><Text onPress={() => { void services.markQuestionNotificationRead(notification.id).then(() => { setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read: true } : item)); router.push(`/course/${notification.courseId}` as never) }) }} className="mt-2 font-semibold text-ink dark:text-white">{notification.title}</Text><Text className="mt-1 text-sm text-muted">{notification.body}</Text>{!notification.read ? <Text onPress={() => { void services.markQuestionNotificationRead(notification.id).then(() => setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read: true } : item))) }} className="mt-3 text-xs font-semibold text-brand">Mark as read</Text> : null}</Card>)}</> : null}<View className="h-5" /></>}
    ListEmptyComponent={<Empty title="No activity yet" body="Reviews, questions, and replies you create will appear here." />}
    renderItem={({ item }) => {
      const course = item.courseId ? courseById.get(item.courseId) : undefined
      const teacher = item.professorId ? teacherById.get(item.professorId) : undefined
      const destination = item.kind === 'professorReview' && item.professorId ? `/professor/${item.professorId}` : item.courseId ? `/course/${item.courseId}` : undefined
      return <Card className="mb-3">
        <Text className="text-xs font-bold text-brand">{labels[item.kind].toUpperCase()}</Text>
        <Text onPress={() => destination && router.push(destination as never)} className="mt-1 font-semibold text-ink dark:text-white">{teacher?.name ?? course?.code ?? 'Bhorosha community'}</Text>
        <Text className="mt-3 leading-5 text-muted">{item.text}</Text>
        <Text className="mt-3 text-xs text-muted">{new Date(item.createdAt).toLocaleDateString()}</Text>
      </Card>
    }} />
  </Screen>
}
