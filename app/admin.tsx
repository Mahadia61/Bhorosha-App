import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, Profile, Review } from '@/lib/types'

type AdminView = 'overview' | 'courses' | 'members' | 'moderation' | 'analytics'
type AdminData = { courses: Course[]; users: Profile[]; reviews: Review[]; questions: CourseQuestion[] }

const emptyAdminData: AdminData = { courses: [], users: [], reviews: [], questions: [] }

export default function AdminWorkspace({ initialView }: { initialView?: AdminView }) {
  const { profile } = useApp()
  const [view, setView] = useState<AdminView>(initialView ?? 'overview')
  const [data, setData] = useState<AdminData>(emptyAdminData)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    const [courses, users, reviews, questions] = await Promise.all([
      services.courses(), services.adminUsers(), services.allReviews(), services.allCourseQuestions(),
    ])
    setData({ courses, users, reviews, questions })
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (initialView) setView(initialView) }, [initialView])

  if (!profile) return <Redirect href="/welcome" />
  if (profile.role !== 'admin') return <Redirect href="/" />

  const removeCourse = (course: Course) => Alert.alert(
    'Remove course?',
    `${course.code} and its related reviews and questions will be deleted.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void services.deleteCourse(course.id).then(load).catch(reason => Alert.alert('Could not remove course', reason instanceof Error ? reason.message : 'Please try again.')) } },
    ],
  )

  const changeStatus = (user: Profile) => Alert.alert(
    user.active === false ? 'Activate account?' : 'Suspend account?',
    user.name,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: user.active === false ? 'Activate' : 'Suspend', style: user.active === false ? 'default' : 'destructive', onPress: () => { void services.updateUserStatus(user, user.active === false).then(load).catch(reason => Alert.alert('Could not update account', reason instanceof Error ? reason.message : 'Please try again.')) } },
    ],
  )

  const averageRating = data.reviews.length
    ? data.reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / 5, 0) / data.reviews.length
    : 0
  const navigation: { id: AdminView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'courses', label: 'Courses', icon: 'book-open' }, { id: 'members', label: 'Members', icon: 'users' }, { id: 'moderation', label: 'Moderation', icon: 'shield' }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  ]

  const content = view === 'overview'
    ? <><Title title="Platform overview" text="Manage your Bhorosha community." /><MetricGrid values={[['Members', data.users.length], ['Courses', data.courses.length], ['Reviews', data.reviews.length], ['Questions', data.questions.length]]} /></>
    : view === 'courses'
      ? <>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1"><Title title="Course catalogue" text="Review courses and teacher assignments." /></View>
            <Button className="mt-0" onPress={() => router.push('/admin-course-form')}>Add course</Button>
          </View>
          {data.courses.length
            ? data.courses.map(course => <Card key={course.id} className="mt-4">
                <Text className="text-xs font-bold text-brand">{course.code}</Text>
                <Text className="mt-1 font-semibold text-ink dark:text-white">{course.title}</Text>
                <Text className="mt-1 text-xs text-muted">{course.semester} · {course.credits} credits</Text>
                <Text className="mt-2 text-xs text-muted">{course.teacherNames.join(', ') || 'No teacher assigned'}</Text>
                {course.tags.length ? <Text className="mt-2 text-xs text-brand">{course.tags.join(' · ')}</Text> : null}
                <View className="mt-4 flex-row justify-between"><Text onPress={() => router.push({ pathname: '/admin-course-form', params: { courseId: course.id } })} className="text-sm font-semibold text-brand">Edit course</Text><Text onPress={() => removeCourse(course)} className="text-sm font-semibold text-rose-600">Remove</Text></View>
              </Card>)
            : <Empty title="No courses yet" body="Add the first course to start assigning teachers." />}
        </>
      : view === 'members'
        ? <><Title title="Member management" text="Suspend or activate student and teacher accounts." /><Search value={query} onChange={setQuery} />{data.users.filter(user => `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(query.toLowerCase())).map(user => <Card key={user.id} className="mt-3"><Text className="font-semibold text-ink dark:text-white">{user.name}</Text><Text className="mt-1 text-xs text-muted">{user.email}</Text><Text className="mt-2 text-xs font-bold text-brand">{user.role.toUpperCase()} · {user.department}</Text>{user.role !== 'admin' ? <Text onPress={() => changeStatus(user)} className={`mt-3 text-sm font-semibold ${user.active === false ? 'text-brand' : 'text-rose-600'}`}>{user.active === false ? 'Activate account' : 'Suspend account'}</Text> : null}</Card>)}</>
        : view === 'moderation'
          ? <><Title title="Moderation" text="Review questions, answers, and student reviews." />{[...data.reviews.map(review => ({ id: review.id, kind: 'Review', text: review.text, remove: () => services.deleteReview(review.id) })), ...data.questions.map(question => ({ id: question.id, kind: 'Question', text: `${question.text}${question.answers?.length ? `\n${question.answers.map(answer => answer.text).join('\n')}` : ''}`, remove: () => services.deleteCourseQuestion(question.id) }))].map(item => <Card key={`${item.kind}-${item.id}`} className="mt-3"><Text className="text-xs font-bold text-brand">{item.kind.toUpperCase()}</Text><Text className="mt-2 text-ink dark:text-white">{item.text}</Text><Text onPress={() => { void item.remove().then(load).catch(reason => Alert.alert('Could not remove content', reason instanceof Error ? reason.message : 'Please try again.')) }} className="mt-3 text-sm font-semibold text-rose-600">Remove content</Text></Card>)}</>
          : <><Title title="Analytics" text="Review trends across your platform." /><MetricGrid values={[['Average rating', averageRating ? averageRating.toFixed(1) : '—'], ['Anonymous reviews', `${data.reviews.length ? Math.round(data.reviews.filter(review => review.anonymous).length / data.reviews.length * 100) : 0}%`], ['Reviews', data.reviews.length], ['Questions', data.questions.length]]} /><Card className="mt-5"><Text className="font-semibold text-ink dark:text-white">Review quality</Text><Stars value={averageRating} /></Card></>

  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingBottom: 40 }}><View className="bg-brand px-5 pb-6 pt-4"><View className="flex-row items-start justify-between gap-4"><View className="flex-1"><Text className="text-2xl font-bold text-white">Admin workspace</Text><Text className="mt-1 text-sm text-blue-100">Courses, members, moderation, and analytics.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open profile and settings" onPress={() => router.push('/(tabs)/profile')} className="h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Text className="text-base font-bold text-white">{profile.name.trim().charAt(0).toUpperCase() || 'A'}</Text></Pressable></View><Text onPress={() => router.push('/(tabs)/profile')} className="mt-3 self-end text-xs font-semibold text-blue-100">Profile & settings</Text></View>{!initialView ? <View className="flex-row flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">{navigation.map(item => <Pressable key={item.id} onPress={() => setView(item.id)} className={`flex-row items-center gap-1 rounded-lg px-2 py-2 ${view === item.id ? 'bg-blue-50' : ''}`}><Feather name={item.icon} size={14} color="#4F7EF7" /><Text className="text-xs font-semibold text-brand">{item.label}</Text></Pressable>)}</View> : null}<View className="px-5 pt-5">{content}</View></ScrollView></SafeAreaView>
}

function Title({ title, text }: { title: string; text: string }) { return <><Text className="text-xl font-bold text-ink dark:text-white">{title}</Text><Text className="mt-1 text-sm text-muted">{text}</Text></> }
function MetricGrid({ values }: { values: [string, string | number][] }) { return <View className="mt-5 flex-row flex-wrap gap-3">{values.map(([label, value]) => <Card key={label} className="w-[47%] p-4"><Text className="text-2xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">{label}</Text></Card>)}</View> }
function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Feather name="search" size={17} color="#64748B" /><TextInput value={value} onChangeText={onChange} placeholder="Search members" placeholderTextColor="#94A3B8" className="flex-1 px-2 py-3 text-ink dark:text-white" /></View> }
