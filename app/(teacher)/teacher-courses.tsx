import { teachesCourse, courseService } from '@/features/courses'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { Card, Empty, FilterOption, FilterSheet, IconFilterButton, LoadingState, Screen, SearchBar } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'
import type { AcademicLevel, Course, CourseType } from '@/types'
import { TeacherHeader } from '@/components/teacher/TeacherHeader'
import { TeacherCourseCard } from '@/components/teacher/teacher-ui'
import { academicLevels, courseTypes } from '@/lib/utils/academic'

type TypeFilter = 'all' | CourseType
type LevelFilter = 'all' | AcademicLevel

export default function TeacherCourses() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [level, setLevel] = useState<LevelFilter>('all')
  const [draftType, setDraftType] = useState<TypeFilter>('all')
  const [draftLevel, setDraftLevel] = useState<LevelFilter>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    setError('')
    try {
      setCourses((await courseService.courses()).filter(course => teachesCourse(course, profile)))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your courses.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => courses.filter(course => {
    const haystack = `${course.code} ${course.title} ${course.courseType ?? ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
      && (type === 'all' || course.courseType === type)
      && (level === 'all' || course.level === level)
  }), [courses, search, type, level])

  if (profile?.role !== 'teacher') return <Redirect href="/" />
  if (loading) return <LoadingState label="Loading courses..." />

  return <Screen>
    <View className="px-5 pt-3">
      <TeacherHeader title="My Courses" subtitle="Your assigned courses" />
      <View className="mt-5">
        <SearchBar pill value={search} onChangeText={setSearch} placeholder="Search your courses..." trailing={<IconFilterButton onPress={() => { setDraftType(type); setDraftLevel(level); setFiltersOpen(true) }} />} />
      </View>
    </View>
    <FlatList
      className="px-5 pt-4"
      contentContainerStyle={{ paddingBottom: 24 }}
      data={visible}
      keyExtractor={course => course.id}
      onRefresh={load}
      refreshing={loading}
      ListEmptyComponent={<Empty title="No courses found" body={error || 'Only courses assigned to you by the admin are shown here.'} />}
      ListFooterComponent={<Card className="mt-2 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900"><Text className="text-sm leading-5 text-slate-600 dark:text-slate-300">Only courses assigned to you by the admin are shown here.</Text></Card>}
      renderItem={({ item }) => <TeacherCourseCard course={item} />}
    />
    <FilterSheet open={filtersOpen} title="Filter courses" subtitle="Narrow by course type and level." onClose={() => setFiltersOpen(false)} onClear={() => { setDraftType('all'); setDraftLevel('all') }} onApply={() => { setType(draftType); setLevel(draftLevel); setFiltersOpen(false) }}>
      <Text className="mt-4 mb-2 text-sm font-bold text-ink dark:text-white">Course type</Text>
      <View className="flex-row flex-wrap gap-2">{[{ key: 'all' as const, label: 'All' }, ...courseTypes.map(item => ({ key: item, label: item }))].map(item => <FilterOption key={item.key} label={item.label} active={draftType === item.key} onPress={() => setDraftType(item.key)} />)}</View>
      <Text className="mt-4 mb-2 text-sm font-bold text-ink dark:text-white">Level</Text>
      <View className="flex-row flex-wrap gap-2">{[{ key: 'all' as const, label: 'All' }, ...academicLevels.map(item => ({ key: item, label: `Level ${item}` }))].map(item => <FilterOption key={item.key} label={item.label} active={draftLevel === item.key} onPress={() => setDraftLevel(item.key)} />)}</View>
    </FilterSheet>
  </Screen>
}
