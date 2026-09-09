import { TeacherProfileEditor } from '@/components/TeacherManagement'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Field } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { academicLevels, academicTerms, adminCourseTypes } from '@/lib/academic'
import type { AcademicLevel, AcademicTerm, Course, CourseStatus, CourseType, TeacherProfile } from '@/lib/types'

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
  const [teachers, setTeachers] = useState<TeacherProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [addingTeacher, setAddingTeacher] = useState(false)
  const [teacherMenuOpen, setTeacherMenuOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [course, users] = await Promise.all([
        courseId ? services.course(courseId) : Promise.resolve<Course | null>(null),
        services.adminTeacherProfiles(),
      ])
      setTeachers(users)
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
    if (selectedTeachers.length !== form.teacherIds.length) {
      const message = 'One of the assigned teacher profiles could not be loaded. Reload the course form before saving.'
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

  return <SafeAreaView className="flex-1 bg-[#F5F6F8]">
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View className="flex-row items-center"><Pressable onPress={() => router.back()} className="mr-4 h-11 w-11 items-center justify-center rounded-full bg-white"><Feather name="arrow-left" size={22} color="#111318" /></Pressable><View><Text className="text-2xl font-bold text-slate-950">{courseId ? 'Edit Course' : 'Add Course'}</Text><Text className="mt-1 text-sm text-slate-500">Create a new course and assign teachers.</Text></View></View>

      {loading ? <View className="items-center py-20"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading course form…</Text></View>
        : error ? <Empty title="Course unavailable" body={error} />
          : <View className="mt-6 gap-4"><CourseFormSection icon="book-open" title="Course Information" subtitle="Basic details about the course."><View className="flex-row gap-3"><View className="flex-1"><Field label="Course code" value={form.code} onChangeText={value => setValue('code', value.toUpperCase())} placeholder="e.g. CSE 405" autoCapitalize="characters" /></View><View className="flex-1"><Field label="Course title" value={form.title} onChangeText={value => setValue('title', value)} placeholder="e.g. Mobile Application Development" /></View></View>
              <View className="flex-row gap-3"><View className="flex-1"><Field label="Credits" value={form.credits} onChangeText={value => setValue('credits', value)} placeholder="e.g. 3" keyboardType="numeric" /></View><View className="flex-1"><Field label="Department" value={form.department} onChangeText={value => setValue('department', value.toUpperCase())} placeholder="CSE" autoCapitalize="characters" /></View></View></CourseFormSection><CourseFormSection icon="award" title="Level & Term" subtitle="Academic level and term for this course."><ChoiceRow label="CUET level" values={academicLevels} value={form.level} onChange={value => setValue('level', value)} format={value => `Level ${value}`} /><ChoiceRow label="CUET term" values={academicTerms} value={form.term} onChange={value => setValue('term', value)} format={value => `Term ${value}`} /></CourseFormSection><CourseFormSection icon="file-text" title="Course Type" subtitle="Select the type of this course."><ChoiceRow label="" values={adminCourseTypes} value={form.courseType} onChange={value => setValue('courseType', value)} /></CourseFormSection><CourseFormSection icon="tag" title="Tags (optional)" subtitle="Add relevant tags to help organize this course."><Field label="" value={form.tags} onChangeText={value => setValue('tags', value)} placeholder="e.g. mobile, frontend, android" /></CourseFormSection><CourseFormSection icon="users" title="Assign Teachers" subtitle="Select teacher profiles to assign to this course.">

              <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">Assign teachers</Text>
              <Text className="mb-3 text-xs leading-4 text-muted">Select teacher profiles, including teachers who have never logged in. Uncheck a teacher to remove the assignment.</Text>
              <Button className="mb-3" variant="outline" onPress={() => setAddingTeacher(true)}>Add Teacher Profile</Button>
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
                      <View className="flex-1"><Text className="font-medium text-ink dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-muted">{teacher.designation ? `${teacher.designation} · ` : ''}{teacher.department} · {teacher.linkedUserId ? 'Linked' : 'Not linked'}</Text></View>
                      <Feather name={selected ? 'check-square' : 'square'} size={19} color={selected ? '#4F7EF7' : '#94A3B8'} />
                    </Pressable>
                  })}
                </View> : null}
              </> : <Empty title="No teachers available" body="Add a teacher profile here or in Members → Teachers. No login is required." />}
              {saveFeedback ? <View className={`mb-3 flex-row items-center rounded-xl px-3 py-3 ${saveFeedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-rose-50 dark:bg-rose-950'}`}>
                <Feather name={saveFeedback.type === 'success' ? 'check-circle' : 'alert-circle'} size={19} color={saveFeedback.type === 'success' ? '#059669' : '#E11D48'} />
                <Text className={`ml-2 flex-1 text-sm font-medium ${saveFeedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{saveFeedback.message}</Text>
              </View> : null}
              </CourseFormSection><CourseFormSection icon="sliders" title="Course Status" subtitle="Control where this course appears."><ChoiceRow label="" values={['active', 'archived', 'draft'] as CourseStatus[]} value={form.status} onChange={value => setValue('status', value)} format={value => value.charAt(0).toUpperCase() + value.slice(1)} /></CourseFormSection><View className="flex-row gap-3"><Button className="flex-1" variant="outline" onPress={() => router.back()}>Cancel</Button><Button className="flex-1" loading={saving} onPress={save}>{courseId ? 'Save changes' : 'Create course'}</Button></View></View>}
    </ScrollView>
    {addingTeacher ? <TeacherProfileEditor onClose={() => setAddingTeacher(false)} onSaved={teacher => { setTeachers(current => [...current, teacher]); setForm(current => ({ ...current, teacherIds: [...current.teacherIds, teacher.id] })); setTeacherMenuOpen(true); setAddingTeacher(false) }} /> : null}
  </SafeAreaView>
}

function CourseFormSection({ icon, title, subtitle, children }: { icon: keyof typeof Feather.glyphMap; title: string; subtitle: string; children: React.ReactNode }) { return <View className="rounded-3xl bg-white p-4 shadow-sm"><View className="mb-4 flex-row items-center gap-3"><View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100"><Feather name={icon} size={20} color="#1670F8" /></View><View><Text className="text-base font-bold text-slate-950">{title}</Text><Text className="mt-0.5 text-xs text-slate-500">{subtitle}</Text></View></View>{children}</View> }

function ChoiceRow<T extends string>({ label, values, value, onChange, format = item => item }: { label: string; values: T[]; value: T | null; onChange: (value: T) => void; format?: (value: T) => string }) {
  return <View className="mb-4"><Text className="mb-2 text-sm font-medium text-ink dark:text-slate-100">{label}</Text><View className="flex-row flex-wrap gap-2">{values.map(item => <Pressable key={item} onPress={() => onChange(item)} className={`rounded-xl border px-3 py-2 ${value === item ? 'border-brand bg-blue-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}><Text className={`text-xs font-semibold ${value === item ? 'text-brand' : 'text-muted'}`}>{format(item)}</Text></Pressable>)}</View></View>
}
