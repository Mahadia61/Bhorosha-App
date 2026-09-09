import { teachesCourse } from '@/lib/teacher-profiles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { router, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course } from '@/lib/types'
import { TeacherHeader } from '@/components/TeacherHeader'

type StatusFilter = 'all' | 'active' | 'archived'

export default function TeacherCourses() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      const assigned = (await services.courses()).filter(course => teachesCourse(course, profile))
      setCourses(assigned)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your courses.')
    } finally {
      setLoading(false)
    }
  }, [profile])
  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => courses.filter(course => {
    const searchable = `${course.code} ${course.title}`.toLowerCase()
    return searchable.includes(search.toLowerCase()) && (status === 'all' || (course.status ?? 'active') === status)
  }), [courses, search, status])
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading courses...</Text></View></Screen>
  return <Screen><View className="px-5 pt-6"><TeacherHeader title="My Courses" /><Text className="mt-1 text-sm text-muted">Your assigned courses and teaching activities.</Text><View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search course code or title" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-base text-ink dark:text-white" /></View><FilterRow value={status} onChange={setStatus} /></View><FlatList className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} data={visible} keyExtractor={course => course.id} ListEmptyComponent={<Empty title="No courses found" body={error || 'Try a different search or status filter.'} />} renderItem={({ item }) => <CourseCard course={item} />} /></Screen>
}

function FilterRow({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  return <View className="mt-4"><Text className="mb-2 text-xs font-semibold text-muted">Status</Text><View className="flex-row gap-2">{(['all', 'active', 'archived'] as const).map(option => <Pressable key={option} onPress={() => onChange(option)} className={`rounded-full px-3 py-2 ${value === option ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold capitalize ${value === option ? 'text-white' : 'text-muted'}`}>{option}</Text></Pressable>)}</View></View>
}

function CourseCard({ course }: { course: Course }) {
 const status = course.status ?? 'active'
 return <Pressable accessibilityRole="button" accessibilityLabel={`View ${course.code} course details`} onPress={() => router.push(`/teacher-course/${course.id}` as never)}><Card className="mb-3"><Text className="text-xs font-bold text-brand">{course.code}</Text><Text className="mt-1 text-base font-semibold text-ink dark:text-white">{course.title}</Text><Text className="mt-3 text-sm text-muted">Teachers: {course.teacherNames.length ? course.teacherNames.join(', ') : 'Not assigned'}</Text><Text className="mt-1 text-sm text-muted">Status: <Text className={status === 'active' ? 'text-emerald-600' : 'text-amber-600'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text></Text></Card></Pressable>
}
