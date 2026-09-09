import { teachesCourse } from '@/lib/teacher-profiles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { academicLabel, academicLevels, academicTerms, courseTypes } from '@/lib/academic'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AcademicLevel, AcademicTerm, Course, CourseType } from '@/lib/types'

export default function Courses() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([]); const [search, setSearch] = useState(''); const [department, setDepartment] = useState<string | null>(null); const [level, setLevel] = useState<AcademicLevel | null>(null); const [term, setTerm] = useState<AcademicTerm | null>(null); const [credit, setCredit] = useState<number | null>(null); const [courseType, setCourseType] = useState<CourseType | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const load = useCallback(async () => { setLoading(true); setError(''); try { setCourses(await services.courses()) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load courses.') } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  const departmental = useMemo(() => profile?.role === 'student' ? courses.filter(course => course.department === profile.department) : profile?.role === 'teacher' ? courses.filter(course => teachesCourse(course, profile)) : courses, [courses, profile])
  const departmentOptions = useMemo(() => [...new Set(departmental.map(course => course.department))].sort(), [departmental])
  const creditOptions = useMemo(() => [...new Set(departmental.map(course => course.credits))].sort((a, b) => a - b), [departmental])
  const visible = useMemo(() => departmental.filter(course => {
    const searchable = `${course.code} ${course.title} ${course.teacherNames.join(' ')} ${course.tags.join(' ')}`.toLowerCase()
    return searchable.includes(search.toLowerCase()) && (!department || course.department === department) && (!level || course.level === level) && (!term || course.term === term) && (!credit || course.credits === credit) && (!courseType || course.courseType === courseType)
  }), [departmental, search, department, level, term, credit, courseType])
  const studentLabel = profile?.role === 'student' && profile.currentLevel && profile.currentTerm ? `Your current term: ${academicLabel(profile.currentLevel, profile.currentTerm)}` : `${profile?.department ?? 'CUET'} catalogue`
  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading courses…</Text></View></Screen>
  return <Screen><View className="px-5 pt-6"><Text className="text-2xl font-bold text-ink dark:text-white">{profile?.role === 'teacher' ? 'My courses' : 'Courses'}</Text><Text className="mt-1 text-sm text-muted">{profile?.role === 'teacher' ? 'Your course history and current teaching assignments.' : studentLabel}</Text>
    <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search code, title, tag, or teacher" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-base text-ink dark:text-white" /></View>
    {departmentOptions.length > 1 ? <FilterRow label="Department" options={departmentOptions} value={department} onChange={setDepartment} /> : <Text className="mt-3 text-xs text-muted">Department: {profile?.role === 'student' ? profile.department : departmentOptions[0] ?? profile?.department ?? 'CUET'}</Text>}
    <FilterRow label="Level" options={academicLevels} value={level} onChange={setLevel} format={item => `L${item}`} />
    <FilterRow label="Term" options={academicTerms} value={term} onChange={setTerm} format={item => `T${item}`} />
    <FilterRow label="Credit" options={creditOptions} value={credit} onChange={setCredit} format={item => `${item} cr`} />
    <FilterRow label="Type" options={courseTypes} value={courseType} onChange={setCourseType} />
  </View><FlatList className="px-5 pt-4" contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} data={visible} keyExtractor={course => course.id} ListEmptyComponent={<Empty title="No courses found" body={error || 'Try a different course filter.'} />} renderItem={({ item }) => <Card className="mb-3"><Text onPress={() => router.push(`/course/${item.id}`)} className="text-xs font-bold text-brand">{item.code}</Text><Text onPress={() => router.push(`/course/${item.id}`)} className="mt-1 text-base font-semibold text-ink dark:text-white">{item.title}</Text><Text className="mt-2 text-sm text-muted">{item.teacherNames.join(', ') || 'Teacher assignment pending'}</Text><Text className="mt-1 text-xs text-muted">{academicLabel(item.level, item.term)} · {item.courseType ?? 'Type not set'} · {item.credits} credits</Text></Card>} /></Screen>
}

function FilterRow<T extends string | number>({ label, options, value, onChange, format = item => String(item) }: { label: string; options: T[]; value: T | null; onChange: (value: T | null) => void; format?: (item: T) => string }) {
  return <View className="mt-3"><Text className="mb-1 text-xs font-semibold text-muted">{label}</Text><View className="flex-row flex-wrap gap-1.5"><Pressable onPress={() => onChange(null)} className={`rounded-full px-2.5 py-1.5 ${value === null ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${value === null ? 'text-white' : 'text-muted'}`}>All</Text></Pressable>{options.map(item => <Pressable key={String(item)} onPress={() => onChange(item)} className={`rounded-full px-2.5 py-1.5 ${value === item ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${value === item ? 'text-white' : 'text-muted'}`}>{format(item)}</Text></Pressable>)}</View></View>
}
