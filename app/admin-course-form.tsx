import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Field } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, Profile } from '@/lib/types'

type CourseForm = {
  code: string
  title: string
  credits: string
  semester: string
  department: string
  teacherIds: string[]
  tags: string
}

const emptyForm = (): CourseForm => ({ code: '', title: '', credits: '', semester: '', department: '', teacherIds: [], tags: '' })

export default function AdminCourseForm() {
  const { profile } = useApp()
  const { courseId: routeCourseId } = useLocalSearchParams<{ courseId?: string | string[] }>()
  const courseId = Array.isArray(routeCourseId) ? routeCourseId[0] : routeCourseId
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [course, users] = await Promise.all([
        courseId ? services.course(courseId) : Promise.resolve<Course | null>(null),
        services.adminUsers(),
      ])
      setTeachers(users.filter(user => user.role === 'teacher'))
      if (courseId && !course) {
        setError('This course no longer exists.')
        return
      }
      if (course) {
        setForm({
          code: course.code,
          title: course.title,
          credits: String(course.credits),
          semester: course.semester,
          department: course.department,
          teacherIds: course.teacherIds,
          tags: course.tags.join(', '),
        })
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load course details.')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { void load() }, [load])

  if (!profile) return <Redirect href="/welcome" />
  if (profile.role !== 'admin') return <Redirect href="/" />

  const setValue = (key: keyof CourseForm, value: string) => setForm(current => ({ ...current, [key]: value }))
  const toggleTeacher = (teacherId: string) => setForm(current => ({
    ...current,
    teacherIds: current.teacherIds.includes(teacherId)
      ? current.teacherIds.filter(id => id !== teacherId)
      : [...current.teacherIds, teacherId],
  }))

  const save = async () => {
    const selectedTeachers = teachers.filter(teacher => form.teacherIds.includes(teacher.id))
    const credits = Number(form.credits)
    if (!form.code.trim() || !form.title.trim() || !form.department.trim() || !form.semester.trim()) {
      Alert.alert('Complete course details', 'Code, title, department, and semester are required.')
      return
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      Alert.alert('Add course credits', 'Enter a valid positive credit value.')
      return
    }
    if (!selectedTeachers.length) {
      Alert.alert('Assign teachers', 'Select at least one teacher for this course.')
      return
    }

    const payload = {
      code: form.code,
      title: form.title,
      credits,
      semester: form.semester,
      department: form.department.trim().toUpperCase(),
      teacherIds: selectedTeachers.map(teacher => teacher.id),
      teacherNames: selectedTeachers.map(teacher => teacher.name),
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    }

    setSaving(true)
    try {
      if (courseId) await services.updateCourse(courseId, payload)
      else await services.createCourse(payload)
      Alert.alert(courseId ? 'Course updated' : 'Course created', 'The course catalogue and teacher assignments are updated.', [{ text: 'Back to catalogue', onPress: () => router.replace('/(admin-tabs)/courses') }])
    } catch (reason) {
      Alert.alert('Could not save course', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Pressable onPress={() => router.back()} className="mb-5 flex-row items-center self-start gap-2">
        <Feather name="arrow-left" size={18} color="#4F7EF7" />
        <Text className="text-sm font-semibold text-brand">Course catalogue</Text>
      </Pressable>
      <Text className="text-2xl font-bold text-ink dark:text-white">{courseId ? 'Edit course' : 'Add course'}</Text>
      <Text className="mt-1 text-sm text-muted">Set course details, optional tags, and one or more teaching assignments.</Text>

      {loading ? <View className="items-center py-20"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading course form…</Text></View>
        : error ? <Empty title="Course unavailable" body={error} />
          : <Card className="mt-6">
              <Field label="Course code" value={form.code} onChangeText={value => setValue('code', value.toUpperCase())} placeholder="CSE 405" autoCapitalize="characters" />
              <Field label="Course title" value={form.title} onChangeText={value => setValue('title', value)} placeholder="Mobile Application Development" />
              <Field label="Credits" value={form.credits} onChangeText={value => setValue('credits', value)} placeholder="e.g. 3" keyboardType="numeric" />
              <Field label="Semester" value={form.semester} onChangeText={value => setValue('semester', value)} placeholder="Level 3, Term 1" />
              <Field label="Department" value={form.department} onChangeText={value => setValue('department', value.toUpperCase())} placeholder="CSE" autoCapitalize="characters" />
              <Field label="Tags (optional, comma separated)" value={form.tags} onChangeText={value => setValue('tags', value)} placeholder="mobile, frontend, android" />

              <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">Assign teachers</Text>
              <Text className="mb-3 text-xs leading-4 text-muted">Select one or more teachers. A teacher may be assigned to several courses.</Text>
              {teachers.length ? teachers.map(teacher => {
                const selected = form.teacherIds.includes(teacher.id)
                return <Pressable key={teacher.id} onPress={() => toggleTeacher(teacher.id)} className={`mb-2 flex-row items-center justify-between rounded-xl border p-3 ${selected ? 'border-brand bg-blue-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
                  <View className="flex-1"><Text className="font-medium text-ink dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-muted">{teacher.designation ? `${teacher.designation} · ` : ''}{teacher.department}{teacher.active === false ? ' · Suspended' : ''}</Text></View>
                  <Feather name={selected ? 'check-circle' : 'circle'} size={20} color={selected ? '#4F7EF7' : '#94A3B8'} />
                </Pressable>
              }) : <Empty title="No teachers available" body="Create or activate a teacher account from Members before assigning a course." />}
              <Button className="mt-4" loading={saving} onPress={save}>{courseId ? 'Save course changes' : 'Create course'}</Button>
            </Card>}
    </ScrollView>
  </SafeAreaView>
}
