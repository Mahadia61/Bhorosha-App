import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Field } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { academicLevels, academicTerms, adminCourseTypes } from '@/lib/academic'
import type { AcademicLevel, AcademicTerm, Course, CourseStatus, CourseType, Profile } from '@/lib/types'

type CourseForm = {
  code: string
  title: string
  credits: string
  level: AcademicLevel | null
  term: AcademicTerm | null
  courseType: CourseType | null
  department: string
  teacherIds: string[]
  tags: string
  status: CourseStatus
}

const emptyForm = (): CourseForm => ({ code: '', title: '', credits: '', level: null, term: null, courseType: null, department: '', teacherIds: [], tags: '', status: 'active' })

export default function AdminCourseForm() {
  const { profile } = useApp()
  const { courseId: routeCourseId } = useLocalSearchParams<{ courseId?: string | string[] }>()
  const courseId = Array.isArray(routeCourseId) ? routeCourseId[0] : routeCourseId
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false)

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
          level: course.level,
          term: course.term,
          courseType: course.courseType,
          department: course.department,
          teacherIds: course.teacherIds,
          tags: course.tags.join(', '),
          status: course.status ?? 'active',
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

  const setValue = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => setForm(current => ({ ...current, [key]: value }))
  const toggleTeacher = (teacherId: string) => setForm(current => ({
    ...current,
    teacherIds: current.teacherIds.includes(teacherId)
      ? current.teacherIds.filter(id => id !== teacherId)
      : [...current.teacherIds, teacherId],
  }))

  const save = async () => {
    setSaveFeedback(null)
    const selectedTeachers = teachers.filter(teacher => form.teacherIds.includes(teacher.id))
    const credits = Number(form.credits)
    const missingFields = [
      !form.code.trim() ? 'course code' : null,
      !form.title.trim() ? 'course title' : null,
      !form.department.trim() ? 'department' : null,
      !form.level ? 'CUET level' : null,
      !form.term ? 'CUET term' : null,
      !form.courseType ? 'course type' : null,
    ].filter((field): field is string => field !== null)
    if (missingFields.length) {
      const message = `Please provide: ${missingFields.join(', ')}.`
      setSaveFeedback({ type: 'error', message })
      Alert.alert('Missing course information', message)
      return
    }
    if (!Number.isFinite(credits) || credits <= 0) {
      const message = 'Enter a valid positive credit value.'
      setSaveFeedback({ type: 'error', message })
      Alert.alert('Invalid credits', message)
      return
    }
    if (!selectedTeachers.length) {
      const message = 'Select at least one teacher for this course.'
      setSaveFeedback({ type: 'error', message })
      Alert.alert('Teacher assignment required', message)
      return
    }

    const payload = {
      code: form.code,
      title: form.title,
      credits,
      level: form.level,
      term: form.term,
      courseType: form.courseType,
      department: form.department.trim().toUpperCase(),
      teacherIds: selectedTeachers.map(teacher => teacher.id),
      teacherNames: selectedTeachers.map(teacher => teacher.name),
      tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      status: form.status,
    }

    setSaving(true)
    try {
      if (courseId) await services.updateCourse(courseId, payload)
      else await services.createCourse(payload)
      setSaveFeedback({ type: 'success', message: courseId ? 'Course updated successfully.' : 'Course created successfully.' })
      Alert.alert(courseId ? 'Course updated' : 'Course created', 'The course catalogue and teacher assignments are updated.', [{ text: 'Back to catalogue', onPress: () => router.replace('/(admin-tabs)/courses') }])
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Please try again.'
      setSaveFeedback({ type: 'error', message })
      Alert.alert('Could not save course', message)
    } finally {
      setSaving(false)
    }
  }

  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text className="text-2xl font-bold text-ink dark:text-white">{courseId ? 'Edit course' : 'Add course'}</Text>
      <Text className="mt-1 text-sm text-muted">Set course details, optional tags, and one or more teaching assignments.</Text>

      {loading ? <View className="items-center py-20"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading course form…</Text></View>
        : error ? <Empty title="Course unavailable" body={error} />
          : <Card className="mt-6">
              <Field label="Course code" value={form.code} onChangeText={value => setValue('code', value.toUpperCase())} placeholder="CSE 405" autoCapitalize="characters" />
              <Field label="Course title" value={form.title} onChangeText={value => setValue('title', value)} placeholder="Mobile Application Development" />
              <Field label="Credits" value={form.credits} onChangeText={value => setValue('credits', value)} placeholder="e.g. 3" keyboardType="numeric" />
              <Field label="Department" value={form.department} onChangeText={value => setValue('department', value.toUpperCase())} placeholder="CSE" autoCapitalize="characters" />
              <ChoiceRow label="CUET level" values={academicLevels} value={form.level} onChange={value => setValue('level', value)} format={value => `Level ${value}`} />
              <ChoiceRow label="CUET term" values={academicTerms} value={form.term} onChange={value => setValue('term', value)} format={value => `Term ${value}`} />
              <ChoiceRow label="Course type" values={adminCourseTypes} value={form.courseType} onChange={value => setValue('courseType', value)} />
              <ChoiceRow label="Course status" values={['active', 'archived', 'draft'] as CourseStatus[]} value={form.status} onChange={value => setValue('status', value)} format={value => value.charAt(0).toUpperCase() + value.slice(1)} />
              <Field label="Tags (optional, comma separated)" value={form.tags} onChangeText={value => setValue('tags', value)} placeholder="mobile, frontend, android" />

              <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">Assign teachers</Text>
              <Text className="mb-3 text-xs leading-4 text-muted">Select one or more teachers. A teacher may be assigned to several courses.</Text>
              {teachers.length ? <>
                <Pressable onPress={() => setTeacherMenuOpen(open => !open)} className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <Text className="flex-1 text-sm text-ink dark:text-white">
                    {form.teacherIds.length
                      ? teachers.filter(teacher => form.teacherIds.includes(teacher.id)).map(teacher => teacher.name).join(', ')
                      : 'Select teachers'}
                  </Text>
                  <Feather name={teacherMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
                </Pressable>
                {teacherMenuOpen ? <View className="mt-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  {teachers.map(teacher => {
                    const selected = form.teacherIds.includes(teacher.id)
                    return <Pressable key={teacher.id} onPress={() => toggleTeacher(teacher.id)} className={`mb-1 flex-row items-center justify-between rounded-lg px-3 py-2 ${selected ? 'bg-blue-50 dark:bg-slate-800' : ''}`}>
                      <View className="flex-1"><Text className="font-medium text-ink dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-muted">{teacher.designation ? `${teacher.designation} · ` : ''}{teacher.department}</Text></View>
                      <Feather name={selected ? 'check-square' : 'square'} size={19} color={selected ? '#4F7EF7' : '#94A3B8'} />
                    </Pressable>
                  })}
                </View> : null}
              </> : <Empty title="No teachers available" body="Create a teacher account from Members before assigning a course." />}
              {saveFeedback ? <View className={`mb-3 flex-row items-center rounded-xl px-3 py-3 ${saveFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-rose-50 dark:bg-rose-950'}`}>
                <Feather name={saveFeedback.type === 'success' ? 'check-circle' : 'alert-circle'} size={19} color={saveFeedback.type === 'success' ? '#059669' : '#E11D48'} />
                <Text className={`ml-2 flex-1 text-sm font-medium ${saveFeedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{saveFeedback.message}</Text>
              </View> : null}
              <Button className="mt-4" loading={saving} onPress={save}>{courseId ? 'Save course changes' : 'Create course'}</Button>
            </Card>}
    </ScrollView>
  </SafeAreaView>
}

function ChoiceRow<T extends string>({ label, values, value, onChange, format = item => item }: { label: string; values: T[]; value: T | null; onChange: (value: T) => void; format?: (value: T) => string }) {
  return <View className="mb-4"><Text className="mb-2 text-sm font-medium text-ink dark:text-slate-100">{label}</Text><View className="flex-row flex-wrap gap-2">{values.map(item => <Pressable key={item} onPress={() => onChange(item)} className={`rounded-xl border px-3 py-2 ${value === item ? 'border-brand bg-blue-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}><Text className={`text-xs font-semibold ${value === item ? 'text-brand' : 'text-muted'}`}>{format(item)}</Text></Pressable>)}</View></View>
}
