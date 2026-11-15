import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, LoadingState, PageHeader, ResultMeta, Screen, SearchBar } from '@/components/ui/ui'
import { courseService } from '@/features/courses'
import { userService } from '@/features/users'
import type { Course, Professor } from '@/types'

type TeacherWithCourses = Professor & { courses: Course[] }

export default function Professors() {
  const [teachers, setTeachers] = useState<TeacherWithCourses[]>([])
  const [search, setSearch] = useState('')
  const [sortAscending, setSortAscending] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [people, courses] = await Promise.all([userService.professors(), courseService.courses()])
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

  const visible = useMemo(() => teachers
    .filter(teacher => {
      const searchable = `${teacher.name} ${teacher.department} ${teacher.designation ?? ''} ${teacher.courses.map(course => `${course.code} ${course.title}`).join(' ')}`.toLowerCase()
      return searchable.includes(search.toLowerCase())
    })
    .sort((left, right) => sortAscending ? left.name.localeCompare(right.name) : right.name.localeCompare(left.name)), [teachers, search, sortAscending])

  if (loading) return <LoadingState label="Loading teachers…" />

  return <Screen>
    <FlatList
      data={visible}
      keyExtractor={item => item.id}
      className="px-5"
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={<>
        <PageHeader title="Teachers" subtitle="Find and explore your teachers at CUET" />
        <View className="mt-5"><SearchBar value={search} onChangeText={setSearch} placeholder="Search by teacher name, department, or course" /></View>
        <View className="mt-5"><ResultMeta count={visible.length} label="teacher" onSort={() => setSortAscending(value => !value)} sortLabel={`Sort: Name (${sortAscending ? 'A–Z' : 'Z–A'})`} /></View>
      </>}
      ListEmptyComponent={<Empty title={error ? 'Unable to load teachers' : 'No teachers found'} body={error || 'Try another search.'} />}
      renderItem={({ item }) => <TeacherCard teacher={item} onPress={() => router.push(`/professor/${item.id}`)} />}
    />
  </Screen>
}

function TeacherCard({ teacher, onPress }: { teacher: TeacherWithCourses; onPress: () => void }) {
  const colors = avatarColor(teacher.name)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open profile for ${teacher.name}`}
      onPress={onPress}
    >
      <Card className="mb-3 p-4">
        <View className="flex-row items-center">
          <View
            style={{ backgroundColor: colors.background }}
            className="h-14 w-14 items-center justify-center rounded-full"
          >
            <Text style={{ color: colors.text }} className="text-xl font-extrabold">
              {initials(teacher.name)}
            </Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-base font-extrabold text-[#172038] dark:text-white">
              {teacher.name}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-[#52627A] dark:text-slate-300">
              {teacher.designation || 'Faculty member'}
            </Text>
            <Text className="text-sm text-[#64718B] dark:text-slate-400">
              Department of {teacher.department}
            </Text>
            <Text className="mt-2 text-xs text-[#52627A] dark:text-slate-300">
              <Text className="font-semibold">Courses: </Text>
              {teacher.courses.length
                ? teacher.courses.slice(0, 3).map(course => course.code).join(', ')
                  + (teacher.courses.length > 3 ? `, +${teacher.courses.length - 3}` : '')
                : 'No courses assigned'}
            </Text>
          </View>
          <Feather name="chevron-right" size={22} color="#172038" />
        </View>
      </Card>
    </Pressable>
  )
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase()
}

function avatarColor(name: string) {
  const colors = [{ background: '#E8F0FE', text: '#1261D6' }, { background: '#E5F7EA', text: '#13833B' }, { background: '#EEE8FF', text: '#6B25D9' }, { background: '#FFE8EA', text: '#E2413E' }, { background: '#FFF6DF', text: '#B88600' }]
  return colors[name.split('').reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length]
}
