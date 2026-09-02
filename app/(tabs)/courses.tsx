import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, RefreshControl, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course } from '@/lib/types'

export default function Courses() {
  const { profile } = useApp(); const [courses, setCourses] = useState<Course[]>([]); const [search, setSearch] = useState(''); const [semester, setSemester] = useState<string | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = useCallback(async () => { setError(''); try { setCourses(await services.courses()) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load courses.') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const departmental = useMemo(() => profile?.role === 'student' ? courses.filter(course => course.department === profile.department) : profile?.role === 'teacher' ? courses.filter(course => course.teacherIds.includes(profile.id)) : courses, [courses, profile])
  const semesters = [...new Set(departmental.map(course => course.semester))]
  const visible = useMemo(() => departmental.filter(course => `${course.code} ${course.title} ${course.teacherNames.join(' ')}`.toLowerCase().includes(search.toLowerCase()) && (!semester || course.semester === semester)), [departmental, search, semester])
  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading courses…</Text></View></Screen>
  return <Screen><View className="px-5 pt-6"><Text className="text-2xl font-bold text-ink dark:text-white">{profile?.role === 'teacher' ? 'My courses' : 'Courses'}</Text><Text className="mt-1 text-sm text-muted">{profile?.role === 'student' ? `${profile.department} courses assigned by your administrator.` : profile?.role === 'teacher' ? 'Courses currently assigned to you by an administrator.' : 'Browse the current course catalogue.'}</Text>
    <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search courses or teachers" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-base text-ink dark:text-white" /></View>
    <FlatList horizontal showsHorizontalScrollIndicator={false} className="mt-3" data={['All', ...semesters]} keyExtractor={item => item} renderItem={({ item }) => { const active = (item === 'All' && !semester) || item === semester; return <Text onPress={() => setSemester(item === 'All' ? null : item)} className={`mr-2 overflow-hidden rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-brand text-white' : 'bg-slate-200 text-muted dark:bg-slate-800'}`}>{item}</Text> }} />
  </View><FlatList className="px-5 pt-3" contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} data={visible} keyExtractor={course => course.id} ListEmptyComponent={<Empty title="No courses found" body={error || 'Try a different search or semester.'} />} renderItem={({ item }) => <Card className="mb-3"><Text onPress={() => router.push(`/course/${item.id}`)} className="text-xs font-bold text-brand">{item.code}</Text><Text onPress={() => router.push(`/course/${item.id}`)} className="mt-1 text-base font-semibold text-ink dark:text-white">{item.title}</Text><Text className="mt-2 text-sm text-muted">{item.teacherNames.join(', ')}</Text><Text className="mt-1 text-xs text-muted">{item.semester} · {item.credits} credits</Text></Card>} /></Screen>
}
