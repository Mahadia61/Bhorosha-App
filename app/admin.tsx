import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/academic'
import type { Course, CourseQuestion, ProfessorReview, Profile, Report, Review } from '@/lib/types'

type AdminView = 'overview' | 'courses' | 'members' | 'moderation' | 'analytics'
type AdminData = { courses: Course[]; users: Profile[]; reviews: Review[]; professorReviews: ProfessorReview[]; questions: CourseQuestion[]; reports: Report[] }

const emptyAdminData: AdminData = { courses: [], users: [], reviews: [], professorReviews: [], questions: [], reports: [] }

export default function AdminWorkspace({ initialView }: { initialView?: AdminView }) {
  const { profile } = useApp()
  const [view, setView] = useState<AdminView>(initialView ?? 'overview')
  const [data, setData] = useState<AdminData>(emptyAdminData)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [courses, users, reviews, professorReviews, questions, reports] = await Promise.all([
        services.courses(), services.adminUsers(), services.allReviews(), services.allProfessorReviews(), services.allCourseQuestions(), services.reports(),
      ])
      setData({ courses, users, reviews, professorReviews, questions, reports })
    } catch (reason) {
      setData(emptyAdminData)
      setLoadError(reason instanceof Error ? reason.message : 'Unable to load the admin workspace.')
    } finally {
      setLoading(false)
    }
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
    ? data.reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / Object.values(review.ratings).length, 0) / data.reviews.length
    : 0
  const courseAnalytics = data.courses.map(course => {
    const reviews = data.reviews.filter(review => review.courseId === course.id)
    const average = reviews.length ? reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0
    return { course, count: reviews.length, average }
  }).sort((left, right) => right.count - left.count || left.course.code.localeCompare(right.course.code))
  const teacherAnalytics = data.users.filter(user => user.role === 'teacher').map(teacher => {
    const reviews = data.professorReviews.filter(review => review.professorId === teacher.id)
    const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0
    return { teacher, count: reviews.length, average, courseCount: data.courses.filter(course => course.teacherIds.includes(teacher.id)).length }
  }).sort((left, right) => right.count - left.count || left.teacher.name.localeCompare(right.teacher.name))
  const navigation: { id: AdminView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'courses', label: 'Courses', icon: 'book-open' }, { id: 'members', label: 'Members', icon: 'users' }, { id: 'moderation', label: 'Moderation', icon: 'shield' }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  ]

  const content = loading
    ? <><Title title="Loading workspace" text="Fetching courses, members, and moderation data." /><Empty title="Loading…" body="Please wait a moment." /></>
    : loadError
      ? <><Title title="Workspace unavailable" text="The platform data could not be loaded." /><Empty title="Could not load data" body={loadError} /><Button className="mt-2" variant="outline" onPress={() => { void load() }}>Try again</Button></>
      : view === 'overview'
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
                <Text className="mt-1 text-xs text-muted">{academicLabel(course.level, course.term)} · {course.courseType ?? 'Type not set'} · {course.credits} credits</Text>
                <Text className="mt-2 text-xs text-muted">{course.teacherNames.join(', ') || 'No teacher assigned'}</Text>
                {course.tags.length ? <Text className="mt-2 text-xs text-brand">{course.tags.join(' · ')}</Text> : null}
                <View className="mt-4 flex-row justify-between"><Text onPress={() => router.push({ pathname: '/admin-course-form', params: { courseId: course.id } })} className="text-sm font-semibold text-brand">Edit course</Text><Text onPress={() => removeCourse(course)} className="text-sm font-semibold text-rose-600">Remove</Text></View>
              </Card>)
            : <Empty title="No courses yet" body="Add the first course to start assigning teachers." />}
        </>
      : view === 'members'
        ? <><Title title="Member management" text="Suspend or activate student and teacher accounts." /><Search value={query} onChange={setQuery} />{data.users.filter(user => `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(query.toLowerCase())).map(user => <Card key={user.id} className="mt-3"><Text className="font-semibold text-ink dark:text-white">{user.name}</Text><Text className="mt-1 text-xs text-muted">{user.email}</Text><Text className="mt-2 text-xs font-bold text-brand">{user.role.toUpperCase()} · {user.department}</Text>{user.emailVerified === false ? <Text className="mt-2 text-xs text-amber-600">Awaiting CUET email verification</Text> : null}{user.warningCount ? <Text className="mt-1 text-xs text-amber-600">{user.warningCount} moderation warning{user.warningCount === 1 ? '' : 's'}</Text> : null}{user.role !== 'admin' ? <Text onPress={() => changeStatus(user)} className={`mt-3 text-sm font-semibold ${user.active === false ? 'text-brand' : 'text-rose-600'}`}>{user.active === false ? 'Activate account' : 'Suspend account'}</Text> : null}</Card>)}</>
        : view === 'moderation'
          ? <><Title title="Moderation" text="Resolve reports first; removing a record is a deliberate action." />{data.reports.length ? data.reports.map(report => <ReportCard key={report.id} report={report} data={data} onResolved={load} />) : <Empty title="No reports awaiting review" body="Reports from students and teachers will appear here." />}</>
          : <><Title title="Analytics" text="Review trends across your platform." /><MetricGrid values={[['Average rating', averageRating ? averageRating.toFixed(1) : '—'], ['Anonymous reviews', `${data.reviews.length ? Math.round(data.reviews.filter(review => review.anonymous).length / data.reviews.length * 100) : 0}%`], ['Reviews', data.reviews.length], ['Questions', data.questions.length]]} /><Card className="mt-5"><Text className="font-semibold text-ink dark:text-white">Review quality</Text><Stars value={averageRating} /></Card><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Course trends</Text>{courseAnalytics.length ? courseAnalytics.map(item => <Card key={item.course.id} className="mt-3"><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="text-xs font-bold text-brand">{item.course.code}</Text><Text className="mt-1 font-semibold text-ink dark:text-white">{item.course.title}</Text><Text className="mt-1 text-xs text-muted">{item.count} review{item.count === 1 ? '' : 's'}</Text></View><View className="items-end"><Stars value={item.average} /><Text className="mt-1 text-xs font-semibold text-muted">{item.average ? item.average.toFixed(1) : '—'} / 5</Text></View></View></Card>) : <Empty title="No course analytics yet" body="Course feedback will appear here after students submit reviews." />}<Text className="mt-7 text-lg font-bold text-ink dark:text-white">Teacher trends</Text>{teacherAnalytics.length ? teacherAnalytics.map(item => <Card key={item.teacher.id} className="mt-3"><View className="flex-row items-center justify-between"><View className="flex-1"><Text className="font-semibold text-ink dark:text-white">{item.teacher.name}</Text><Text className="mt-1 text-xs text-muted">{item.courseCount} assigned course{item.courseCount === 1 ? '' : 's'} · {item.count} profile review{item.count === 1 ? '' : 's'}</Text></View><View className="items-end"><Stars value={item.average} /><Text className="mt-1 text-xs font-semibold text-muted">{item.average ? item.average.toFixed(1) : '—'} / 5</Text></View></View></Card>) : <Empty title="No teacher analytics yet" body="Activate teacher accounts and assign courses to see teaching trends." />}</>

  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingBottom: 40 }}><View className="bg-brand px-5 pb-6 pt-4"><View className="flex-row items-start justify-between gap-4"><View className="flex-1"><Text className="text-2xl font-bold text-white">Admin workspace</Text><Text className="mt-1 text-sm text-blue-100">Courses, members, moderation, and analytics.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open profile and settings" onPress={() => router.push('/admin-profile' as never)} className="h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Text className="text-base font-bold text-white">{profile.name.trim().charAt(0).toUpperCase() || 'A'}</Text></Pressable></View><Text onPress={() => router.push('/admin-profile' as never)} className="mt-3 self-end text-xs font-semibold text-blue-100">Profile & settings</Text></View>{!initialView ? <View className="flex-row flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">{navigation.map(item => <Pressable key={item.id} onPress={() => setView(item.id)} className={`flex-row items-center gap-1 rounded-lg px-2 py-2 ${view === item.id ? 'bg-blue-50' : ''}`}><Feather name={item.icon} size={14} color="#4F7EF7" /><Text className="text-xs font-semibold text-brand">{item.label}</Text></Pressable>)}</View> : null}<View className="px-5 pt-5">{content}</View></ScrollView></SafeAreaView>
}

function Title({ title, text }: { title: string; text: string }) { return <><Text className="text-xl font-bold text-ink dark:text-white">{title}</Text><Text className="mt-1 text-sm text-muted">{text}</Text></> }
function MetricGrid({ values }: { values: [string, string | number][] }) { return <View className="mt-5 flex-row flex-wrap gap-3">{values.map(([label, value]) => <Card key={label} className="w-[47%] p-4"><Text className="text-2xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">{label}</Text></Card>)}</View> }
function Search({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <View className="mt-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><Feather name="search" size={17} color="#64748B" /><TextInput value={value} onChangeText={onChange} placeholder="Search members" placeholderTextColor="#94A3B8" className="flex-1 px-2 py-3 text-ink dark:text-white" /></View> }

function ReportCard({ report, data, onResolved }: { report: Report; data: AdminData; onResolved: () => Promise<void> }) {
  const questionWithAnswer = report.contentType === 'answer' ? data.questions.find(question => question.answers?.some(answer => answer.id === report.contentId)) : undefined
  const content = report.contentType === 'courseReview'
    ? data.reviews.find(item => item.id === report.contentId)?.text
    : report.contentType === 'professorReview'
      ? data.professorReviews.find(item => item.id === report.contentId)?.text
      : report.contentType === 'courseQuestion'
        ? data.questions.find(item => item.id === report.contentId)?.text
        : questionWithAnswer?.answers?.find(answer => answer.id === report.contentId)?.text
  const resolve = async (status: Report['status'], remove = false) => {
    try {
      if (remove) {
        if (report.contentType === 'courseReview') await services.deleteReview(report.contentId)
        else if (report.contentType === 'professorReview') await services.deleteProfessorReview(report.contentId)
        else if (report.contentType === 'courseQuestion') await services.deleteCourseQuestion(report.contentId)
        else if (questionWithAnswer) await services.deleteQuestionAnswer(questionWithAnswer.id, report.contentId)
      }
      if (status === 'warned') await services.warnReportedUser(report.id)
      else await services.updateReportStatus(report.id, status)
      await onResolved()
    } catch (reason) {
      Alert.alert('Could not resolve report', reason instanceof Error ? reason.message : 'Please try again.')
    }
  }
  return <Card className="mt-3"><Text className="text-xs font-bold text-brand">{report.contentType.toUpperCase()} · {report.status.toUpperCase()}</Text><Text className="mt-2 text-xs text-rose-600">Reported for: {report.reason}</Text><Text className="mt-2 leading-5 text-ink dark:text-white">{content ?? 'The reported content is no longer available.'}</Text><View className="mt-4 flex-row flex-wrap gap-3"><Text onPress={() => { void resolve('kept') }} className="text-sm font-semibold text-brand">Keep</Text><Text onPress={() => Alert.alert('Warn account?', 'This creates a private account warning without revealing the author in the app.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Warn', style: 'destructive', onPress: () => { void resolve('warned') } }])} className="text-sm font-semibold text-amber-600">Warn user</Text><Text onPress={() => Alert.alert('Remove content?', 'This removes the public community record.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void resolve('removed', true) } }])} className="text-sm font-semibold text-rose-600">Remove</Text></View></Card>
}
