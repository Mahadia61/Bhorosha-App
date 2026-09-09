import { teachesCourse } from '@/lib/teacher-profiles'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { academicLabel, academicLevels, academicTerms, courseTypes } from '@/lib/academic'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AcademicLevel, AcademicTerm, Course, CourseType } from '@/lib/types'

export default function Courses() {
  const { profile, isDark } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState<string | null>(null)
  const [level, setLevel] = useState<AcademicLevel | null>(null)
  const [term, setTerm] = useState<AcademicTerm | null>(null)
  const [credit, setCredit] = useState<number | null>(null)
  const [courseType, setCourseType] = useState<CourseType | null>(null)
  const [draft, setDraft] = useState<FilterState>({ department: null, level: null, term: null, credit: null, courseType: null })
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setCourses(await services.courses()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load courses.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const departmental = useMemo(() => profile?.role === 'student'
    ? courses.filter(course => course.department === profile.department)
    : profile?.role === 'teacher' ? courses.filter(course => teachesCourse(course, profile)) : courses, [courses, profile])
  const departmentOptions = useMemo(() => [...new Set(departmental.map(course => course.department))].sort(), [departmental])
  const creditOptions = useMemo(() => [...new Set(departmental.map(course => course.credits))].sort((a, b) => a - b), [departmental])
  const visible = useMemo(() => departmental.filter(course => {
    const searchable = `${course.code} ${course.title} ${course.teacherNames.join(' ')} ${course.tags.join(' ')}`.toLowerCase()
    return searchable.includes(search.toLowerCase())
      && (!department || course.department === department)
      && (!level || course.level === level)
      && (!term || course.term === term)
      && (!credit || course.credits === credit)
      && (!courseType || course.courseType === courseType)
  }), [departmental, search, department, level, term, credit, courseType])
  const activeFilterCount = [department, level, term, credit, courseType].filter(Boolean).length
  const openFilters = () => {
    setDraft({ department, level, term, credit, courseType })
    setFilterOpen(true)
  }
  const applyFilters = () => {
    setDepartment(draft.department)
    setLevel(draft.level)
    setTerm(draft.term)
    setCredit(draft.credit)
    setCourseType(draft.courseType)
    setFilterOpen(false)
  }
  const clearFilters = () => setDraft({ department: null, level: null, term: null, credit: null, courseType: null })

  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#1670F8" /><Text className="mt-3 text-sm text-muted">Loading courses…</Text></View></Screen>

  return <Screen>
    <FlatList
      data={visible}
      keyExtractor={course => course.id}
      className="px-5"
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">{profile?.role === 'teacher' ? 'My Courses' : 'Courses'}</Text>
            <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">Explore courses and find what suits you.</Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/student-notifications' as never)} className="h-11 w-11 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#111318'} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open student profile" onPress={() => router.push('/(tabs)/profile' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-lg font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable>
          </View>
        </View>
        <View className="mt-5 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64718B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search by course code, title, teacher, or tag" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-[15px] text-[#172038] dark:text-white" /></View>
        <View className="mt-5 flex-row items-center justify-between"><Text className="text-sm text-[#64718B] dark:text-slate-400">{visible.length} course{visible.length === 1 ? '' : 's'} found</Text><Pressable accessibilityRole="button" onPress={openFilters} className="flex-row items-center gap-2 rounded-xl border border-[#E7EAF0] bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"><Feather name="sliders" size={15} color="#1670F8" /><Text className="text-sm font-bold text-[#172038] dark:text-white">Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}</Text></Pressable></View>
      </>}
      ListEmptyComponent={<Empty title="No courses found" body={error || 'Try a different search or filter.'} />}
      renderItem={({ item }) => <CourseCard course={item} onPress={() => router.push(`/course/${item.id}`)} />}
    />
    <FilterModal open={filterOpen} draft={draft} departments={departmentOptions} credits={creditOptions} onChange={setDraft} onClear={clearFilters} onClose={() => setFilterOpen(false)} onApply={applyFilters} />
  </Screen>
}

type FilterState = { department: string | null; level: AcademicLevel | null; term: AcademicTerm | null; credit: number | null; courseType: CourseType | null }

function CourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const colors = courseColor(course.code)
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${course.code} ${course.title}`} onPress={onPress} className="mb-3 flex-row rounded-2xl border border-[#E7EAF0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
    <View style={{ backgroundColor: colors.background }} className="h-[88px] w-[88px] items-center justify-center rounded-xl"><Text style={{ color: colors.text }} className="text-lg font-extrabold">{course.code.split(' ').map(part => part).join('\n')}</Text></View>
    <View className="ml-4 flex-1 justify-center"><Text numberOfLines={2} className="text-base font-extrabold text-[#172038] dark:text-white">{course.title}</Text><Text numberOfLines={1} className="mt-1 text-sm text-[#64718B] dark:text-slate-400">{course.teacherNames.join(', ') || 'Teacher assignment pending'}</Text><View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1"><Meta icon="book-open" text={course.level ? `Level ${course.level}` : 'Level —'} /><Meta icon="calendar" text={course.term ? `Term ${course.term}` : 'Term —'} /><Meta icon="layers" text={course.courseType ?? 'Type not set'} /><Meta icon="clock" text={`${course.credits} credits`} /></View>{course.tags.length ? <View className="mt-2 flex-row flex-wrap gap-1.5">{course.tags.slice(0, 3).map(tag => <Text key={tag} style={{ color: colors.text, backgroundColor: colors.background }} className="rounded-md px-2 py-1 text-[11px] font-semibold">{tag}</Text>)}</View> : null}</View>
  </Pressable>
}

function Meta({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return <View className="flex-row items-center gap-1"><Feather name={icon} size={14} color="#71809A" /><Text className="text-xs text-[#64718B] dark:text-slate-400">{text}</Text></View>
}

function FilterModal({ open, draft, departments, credits, onChange, onClear, onClose, onApply }: { open: boolean; draft: FilterState; departments: string[]; credits: number[]; onChange: (value: FilterState) => void; onClear: () => void; onClose: () => void; onApply: () => void }) {
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}><Pressable onPress={onClose} className="flex-1 justify-end bg-black/25"><Pressable onPress={() => {}} className="max-h-[88%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-slate-900"><View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200 dark:bg-slate-700" /><View className="flex-row items-center justify-between"><View><Text className="text-xl font-extrabold text-[#172038] dark:text-white">Filter courses</Text><Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">Refine the course catalogue.</Text></View><Pressable onPress={onClear}><Text className="text-sm font-bold text-[#1670F8]">Clear all</Text></Pressable></View><FlatList data={[{ label: 'Department', options: departments, value: draft.department, key: 'department' }, { label: 'Level', options: academicLevels, value: draft.level, key: 'level' }, { label: 'Term', options: academicTerms, value: draft.term, key: 'term' }, { label: 'Credits', options: credits, value: draft.credit, key: 'credit' }, { label: 'Course type', options: courseTypes, value: draft.courseType, key: 'courseType' }]} keyExtractor={item => item.key} renderItem={({ item }) => <FilterGroup label={item.label} options={item.options} value={item.value} onChange={value => onChange({ ...draft, [item.key]: value } as FilterState)} format={item.key === 'level' ? value => `Level ${value}` : item.key === 'term' ? value => `Term ${value}` : item.key === 'credit' ? value => `${value} credits` : undefined} />} contentContainerStyle={{ paddingBottom: 18 }} showsVerticalScrollIndicator={false} /><View className="flex-row gap-3"><Pressable onPress={onClose} className="flex-1 items-center rounded-xl border border-slate-200 py-3.5 dark:border-slate-700"><Text className="font-bold text-[#172038] dark:text-white">Cancel</Text></Pressable><Pressable onPress={onApply} className="flex-1 items-center rounded-xl bg-[#1670F8] py-3.5"><Text className="font-bold text-white">Apply filters</Text></Pressable></View></Pressable></Pressable></Modal>
}

function FilterGroup<T extends string | number>({ label, options, value, onChange, format = option => String(option) }: { label: string; options: T[]; value: T | null; onChange: (value: T | null) => void; format?: (option: T) => string }) {
  return <View className="mt-5"><Text className="mb-2 text-sm font-semibold text-[#172038] dark:text-white">{label}</Text><View className="flex-row flex-wrap gap-2"><FilterOption label="All" active={value === null} onPress={() => onChange(null)} />{options.map(option => <FilterOption key={String(option)} label={format(option)} active={value === option} onPress={() => onChange(option)} />)}</View></View>
}

function FilterOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} className={`flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${active ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}><View className={`h-4 w-4 rounded-full border-2 ${active ? 'border-brand bg-brand' : 'border-slate-300 dark:border-slate-600'}`} /> <Text className="text-sm text-[#172038] dark:text-white">{label}</Text></Pressable>
}

function courseColor(code: string) {
  const colors = [{ background: '#E8F0FE', text: '#1261D6' }, { background: '#EEE8FF', text: '#6B25D9' }, { background: '#E5F7EA', text: '#13833B' }, { background: '#FFF6DF', text: '#C28700' }, { background: '#FFE8EA', text: '#E2413E' }]
  return colors[code.split('').reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length]
}
