import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, Professor } from '@/lib/types'

type TeacherWithCourses = Professor & { courses: Course[] }
type FilterKey = 'department' | 'designation' | 'course'

export default function Professors() {
  const { profile, isDark } = useApp()
  const [teachers, setTeachers] = useState<TeacherWithCourses[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey | null>(null)
  const [filterValue, setFilterValue] = useState('all')
  const [sortAscending, setSortAscending] = useState(true)
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [people, courses] = await Promise.all([services.professors(), services.courses()])
      setTeachers(people.map(teacher => ({
        ...teacher,
        courses: courses.filter(course => course.teacherIds.includes(teacher.id) || course.teacherNames.includes(teacher.name)),
      })))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load teachers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const departments = useMemo(() => [...new Set(teachers.map(teacher => teacher.department).filter(Boolean))].sort(), [teachers])
  const designations = useMemo(() => [...new Set(teachers.map(teacher => teacher.designation).filter((value): value is string => Boolean(value)))].sort(), [teachers])
  const courseOptions = useMemo(() => [...new Set(teachers.flatMap(teacher => teacher.courses.map(course => course.code)))].sort(), [teachers])
  const visible = useMemo(() => teachers
    .filter(teacher => {
      const searchable = `${teacher.name} ${teacher.department} ${teacher.designation ?? ''} ${teacher.courses.map(course => `${course.code} ${course.title}`).join(' ')}`.toLowerCase()
      const matchesSearch = searchable.includes(search.toLowerCase())
      const matchesFilter = filterValue === 'all'
        || (filter === 'department' && teacher.department === filterValue)
        || (filter === 'designation' && teacher.designation === filterValue)
        || (filter === 'course' && teacher.courses.some(course => course.code === filterValue))
      return matchesSearch && matchesFilter
    })
    .sort((left, right) => sortAscending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name)), [teachers, search, filter, filterValue, sortAscending])

  const options = filter === 'department' ? departments : filter === 'designation' ? designations : courseOptions
  const chooseFilter = (next: FilterKey | null) => {
    setFilter(next)
    setFilterValue('all')
    setFilterOpen(Boolean(next))
  }

  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#1670F8" /><Text className="mt-3 text-sm text-muted">Loading teachers…</Text></View></Screen>

  return <Screen>
    <FlatList
      data={visible}
      keyExtractor={item => item.id}
      className="px-5"
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<>
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">Teachers</Text>
            <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">Find and explore your teachers at CUET</Text>
          </View>
          <View className="flex-row gap-3">
            <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/student-notifications' as never)} className="relative h-11 w-11 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#111318'} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open student profile" onPress={() => router.push('/(tabs)/profile' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-lg font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable>
          </View>
        </View>
        <View className="mt-5 flex-row items-center gap-2"><View className="flex-1 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64718B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search by teacher name, department, or course" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-sm text-[#172038] dark:text-white" /></View><Pressable accessibilityRole="button" accessibilityLabel="Open teacher filters" onPress={() => setFilterOpen(true)} className="h-12 w-12 items-center justify-center rounded-xl border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"><Feather name="sliders" size={19} color="#1670F8" /></Pressable></View>
        <View className="mt-4 flex-row gap-2">{(['all', 'department', 'designation', 'course'] as const).map(item => <Pressable key={item} onPress={() => item === 'all' ? (setFilter(null), setFilterValue('all')) : chooseFilter(item)} className={`rounded-xl px-4 py-2.5 ${item === 'all' && !filter ? 'bg-[#1670F8]' : 'bg-white dark:bg-slate-900'}`}><Text className={`text-xs font-bold ${item === 'all' && !filter ? 'text-white' : 'text-[#172038] dark:text-white'}`}>{item === 'all' ? 'All' : item === 'course' ? 'Course Taught' : item.charAt(0).toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
        <View className="mt-5 flex-row items-center justify-between"><Text className="text-sm text-[#64718B] dark:text-slate-400">{visible.length} teacher{visible.length === 1 ? '' : 's'} found</Text><Pressable onPress={() => setSortAscending(value => !value)} className="flex-row items-center gap-2 rounded-xl border border-[#E7EAF0] bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"><Text className="text-xs font-semibold text-[#172038] dark:text-white">Sort: Name ({sortAscending ? 'A–Z' : 'Z–A'})</Text><Feather name="chevron-down" size={15} color="#64718B" /></Pressable></View>
      </>}
      ListEmptyComponent={<Empty title={error ? 'Unable to load teachers' : 'No teachers found'} body={error || 'Try another search or filter.'} />}
      renderItem={({ item }) => <TeacherCard teacher={item} onPress={() => router.push(`/professor/${item.id}`)} />}
    />
    <TeacherFilterModal open={filterOpen} filter={filter} value={filterValue} options={options} onClose={() => setFilterOpen(false)} onSelect={value => { setFilterValue(value); setFilterOpen(false) }} />
  </Screen>
}

function TeacherCard({ teacher, onPress }: { teacher: TeacherWithCourses; onPress: () => void }) {
  const colors = avatarColor(teacher.name)
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open profile for ${teacher.name}`} onPress={onPress}><Card className="mb-3 flex-row items-center p-4"><View style={{ backgroundColor: colors.background }} className="h-14 w-14 items-center justify-center rounded-full"><Text style={{ color: colors.text }} className="text-xl font-extrabold">{initials(teacher.name)}</Text></View><View className="ml-4 flex-1"><Text className="text-base font-extrabold text-[#172038] dark:text-white">{teacher.name}</Text><Text className="mt-1 text-sm font-semibold text-[#52627A] dark:text-slate-300">{teacher.designation || 'Faculty member'}</Text><Text className="text-sm text-[#64718B] dark:text-slate-400">Department of {teacher.department}</Text><View className="mt-2 flex-row items-center gap-1.5"><Feather name="book-open" size={14} color="#52627A" /><Text className="text-xs font-semibold text-[#52627A] dark:text-slate-300">Courses:</Text><View className="flex-1 flex-row flex-wrap gap-1.5">{teacher.courses.slice(0, 3).map(course => <Text key={course.id} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#52627A] dark:bg-slate-800 dark:text-slate-300">{course.code}</Text>)}{teacher.courses.length > 3 ? <Text className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-[#52627A] dark:bg-slate-800 dark:text-slate-300">+{teacher.courses.length - 3}</Text> : null}</View></View></View><Feather name="chevron-right" size={22} color="#172038" /></Card></Pressable>
}

function TeacherFilterModal({ open, filter, value, options, onClose, onSelect }: { open: boolean; filter: FilterKey | null; value: string; options: string[]; onClose: () => void; onSelect: (value: string) => void }) {
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}><Pressable onPress={onClose} className="flex-1 justify-end bg-black/25"><Pressable onPress={() => {}} className="max-h-[72%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-slate-900"><View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200 dark:bg-slate-700" /><View className="flex-row items-center justify-between"><View><Text className="text-xl font-extrabold text-[#172038] dark:text-white">Filter teachers</Text><Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">{filter ? `Choose ${filter === 'course' ? 'a course' : filter}` : 'Choose a filter'}</Text></View><Pressable onPress={() => onSelect('all')}><Text className="text-sm font-bold text-[#1670F8]">Clear</Text></Pressable></View>{filter ? <FlatList data={['all', ...options]} keyExtractor={item => item} contentContainerStyle={{ paddingTop: 10, paddingBottom: 18 }} renderItem={({ item }) => <Pressable onPress={() => onSelect(item)} className={`mt-2 flex-row items-center justify-between rounded-xl border px-4 py-3.5 ${value === item ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}><Text className="text-sm font-semibold text-[#172038] dark:text-white">{item === 'all' ? 'All' : item}</Text>{value === item ? <Feather name="check" size={18} color="#1670F8" /> : null}</Pressable>} /> : <Text className="py-8 text-center text-sm text-muted">Select Department, Designation, or Course Taught first.</Text>}</Pressable></Pressable></Modal>
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase()
}

function avatarColor(name: string) {
  const colors = [{ background: '#E8F0FE', text: '#1261D6' }, { background: '#E5F7EA', text: '#13833B' }, { background: '#EEE8FF', text: '#6B25D9' }, { background: '#FFE8EA', text: '#E2413E' }, { background: '#FFF6DF', text: '#B88600' }]
  return colors[name.split('').reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length]
}
