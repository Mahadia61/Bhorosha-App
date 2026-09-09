import { teachesCourse } from '@/lib/teacher-profiles'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen, Stars } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'
import { services } from '@/lib/services'
import type { Course, CourseQuestion, Review } from '@/lib/types'
import { academicLabel } from '@/lib/academic'
import { TeacherHeader } from '@/components/TeacherHeader'

export default function Home() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [ratingSummary, setRatingSummary] = useState<Record<string, { average: number; count: number }>>({})
  const [notifications, setNotifications] = useState(0)
  const [teacherQuestions, setTeacherQuestions] = useState<CourseQuestion[]>([])
  const [teacherReviews, setTeacherReviews] = useState<Review[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const load = async () => { setRefreshing(true); setError(''); try { const nextCourses = await services.courses(); setCourses(nextCourses); if (profile?.role === 'teacher') { const assigned = nextCourses.filter(course => teachesCourse(course, profile)); const [notifications, questions, reviews] = await Promise.all([services.teacherNotifications(profile.id), services.teacherQuestions(profile.id), Promise.all(assigned.map(course => services.reviews(course.id)))]); setNotifications(notifications.filter(item => !item.read).length); setTeacherQuestions(questions); setTeacherReviews(reviews.flat()) } if (profile?.role === 'student') { const departmentCourses = nextCourses.filter(course => course.department === profile.department); const summaries = await Promise.all(departmentCourses.map(async course => { const reviews = await services.reviews(course.id); const average = reviews.length ? reviews.reduce((total, review) => total + Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0; return [course.id, { average, count: reviews.length }] as const })); setRatingSummary(Object.fromEntries(summaries)) } } catch (reason) { setCourses([]); setRatingSummary({}); setTeacherQuestions([]); setTeacherReviews([]); setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.') } finally { setRefreshing(false) } }
  useEffect(() => { void load() }, [profile?.role, profile?.id, profile?.teacherProfileId])
  const isTeacher = profile?.role === 'teacher'
  const visibleCourses = useMemo(() => {
    if (isTeacher) return courses.filter(course => teachesCourse(course, { id: profile?.id ?? '', teacherProfileId: profile?.teacherProfileId }))
    return courses.filter(course => course.department === profile?.department).slice(0, 3)
  }, [courses, isTeacher, profile?.department, profile?.id, profile?.teacherProfileId])
  const teacherAverage = teacherReviews.length ? teacherReviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, value) => total + value, 0) / Object.values(review.ratings).length, 0) / teacherReviews.length : 0
  const pendingQuestions = teacherQuestions.filter(question => !(question.answers ?? []).some(answer => answer.authorRole === 'teacher')).length
  const teacherActivity = [...teacherQuestions.map(question => ({ icon: 'message-circle' as const, label: 'Student asked a question', time: question.createdAt })), ...teacherReviews.map(review => ({ icon: 'star' as const, label: 'New anonymous review received', time: review.createdAt }))].sort((left, right) => right.time - left.time).slice(0, 3)

  return <Screen><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
    {isTeacher ? <TeacherHeader title="Teacher dashboard" /> : <Text className="mt-6 text-sm text-muted">Welcome back,</Text>}
    {isTeacher && notifications > 0 ? <Text onPress={() => router.push('/teacher-notifications')} className="mt-2 self-start rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand dark:bg-slate-800">{notifications} unread notification{notifications === 1 ? '' : 's'}</Text> : null}
    <Text className="text-3xl font-bold text-ink dark:text-white">{profile?.name ?? 'CUET Member'}</Text>{!isTeacher && profile?.currentLevel && profile.currentTerm ? <Text className="mt-1 text-sm text-muted">{profile.department} · {academicLabel(profile.currentLevel, profile.currentTerm)}</Text> : null}
    {isTeacher ? <><Text className="mt-2 text-2xl font-bold text-ink dark:text-white">Good morning, {profile?.name ?? 'Teacher'}</Text><Text className="mt-1 text-sm text-muted">Your teaching overview · Last activity {teacherActivity[0] ? new Date(teacherActivity[0].time).toLocaleString() : 'No recent activity'}</Text><View className="mt-6 flex-row flex-wrap gap-3"><DashboardMetric icon="book-open" label="Active courses" value={visibleCourses.length} /><DashboardMetric icon="users" label="Students enrolled" value="0" /><DashboardMetric icon="star" label="Average rating" value={teacherReviews.length ? `${teacherAverage.toFixed(1)} / 5` : 'No data'} /><DashboardMetric icon="help-circle" label="Pending Questions" value={pendingQuestions} /></View></> : <Card className="mt-6 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900"><View className="flex-row gap-3"><View className="h-11 w-11 items-center justify-center rounded-xl bg-brand"><Feather name="shield" size={21} color="white" /></View><View className="flex-1"><Text className="font-semibold text-ink dark:text-white">Your voice is protected</Text><Text className="mt-1 text-sm leading-5 text-muted">Reviews are anonymous by default. Teachers only see constructive, aggregated feedback.</Text></View></View></Card>}
    {!isTeacher ? <><View className="mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-ink dark:text-white">{`Popular in ${profile?.department || 'your department'}`}</Text><Text onPress={() => router.push('/(student-tabs)/courses')} className="text-sm font-semibold text-brand">See all</Text></View>
    {visibleCourses.length ? visibleCourses.map(course => <Card key={course.id} className="mt-3">
      <Text onPress={() => router.push(`/course/${course.id}`)} className="text-xs font-bold text-brand">{course.code}</Text>
      <Text onPress={() => router.push(`/course/${course.id}`)} className="mt-1 text-base font-semibold text-ink dark:text-white">{course.title}</Text>
      <Text className="mt-1 text-sm text-muted">{course.teacherNames.join(', ')} · {academicLabel(course.level, course.term)}</Text>
      <View className="mt-3 flex-row items-center gap-2"><Stars value={ratingSummary[course.id]?.average ?? 0} /><Text className="text-xs text-muted">{ratingSummary[course.id]?.count ? `${ratingSummary[course.id].count} community review${ratingSummary[course.id].count === 1 ? '' : 's'}` : 'No community reviews yet'}</Text></View>
    </Card>) : <Empty title={error ? 'Unable to load courses' : 'No courses found'} body={error || 'Courses for your department will appear here.'} />}</> : null}
    {isTeacher ? <><Card className="mt-6"><Text className="font-semibold text-ink dark:text-white">Teaching performance</Text><Text className="mt-3 text-xs font-semibold uppercase text-muted">Average rating</Text><View className="mt-2 flex-row items-center gap-3"><Stars value={teacherAverage} /><Text className="text-sm text-muted">{teacherReviews.length ? `${teacherAverage.toFixed(1)} / 5` : 'No reviews yet'}</Text></View><Text className="mt-2 text-xs text-muted">{teacherReviews.length ? `Based on ${teacherReviews.length} anonymous review${teacherReviews.length === 1 ? '' : 's'}` : 'Based on no reviews yet'}</Text></Card><Text className="mt-7 text-xl font-bold text-ink dark:text-white">Quick actions</Text><View className="mt-3 flex-row flex-wrap gap-3"><QuickAction icon="book-open" label="Manage courses" route="/(teacher-tabs)/courses" /><QuickAction icon="message-circle" label="Answer questions" route="/(teacher-tabs)/questions" /><QuickAction icon="star" label="View feedback" route="/(teacher-tabs)/feedback" /><QuickAction icon="bar-chart-2" label="View insights" route="/(teacher-tabs)/insights" /></View><View className="mt-7 flex-row items-center justify-between"><Text className="text-xl font-bold text-ink dark:text-white">Recent activity</Text><Text onPress={() => router.push('/teacher-notifications')} className="text-sm font-semibold text-brand">View all</Text></View><Card className="mt-3">{teacherActivity.length ? teacherActivity.map(item => <View key={`${item.label}-${item.time}`} className="flex-row items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Feather name={item.icon} size={18} color="#4F7EF7" /><View><Text className="text-sm text-ink dark:text-white">{item.label}</Text><Text className="mt-1 text-xs text-muted">{new Date(item.time).toLocaleString()}</Text></View></View>) : <Text className="py-3 text-sm text-muted">No recent activity yet.</Text>}</Card></> : <Card className="mt-6"><View className="flex-row items-center gap-3"><Feather name="message-circle" size={21} color="#4F7EF7" /><View className="flex-1"><Text className="font-semibold text-ink dark:text-white">Share helpful feedback</Text><Text className="mt-1 text-sm text-muted">Choose a course, add ratings, and decide whether your name stays hidden.</Text></View></View></Card>}
  </ScrollView></Screen>
}

function DashboardMetric({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string | number }) {
  return <Card className="min-w-[46%] flex-1"><Feather name={icon} size={18} color="#4F7EF7" /><Text className="mt-2 text-xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">{label}</Text></Card>
}

function QuickAction({ icon, label, route }: { icon: keyof typeof Feather.glyphMap; label: string; route: string }) {
  return <Text onPress={() => router.push(route as never)} className="w-[47%] rounded-xl border border-slate-200 px-3 py-3 text-center text-sm font-semibold text-brand dark:border-slate-700"><Feather name={icon} size={15} color="#4F7EF7" /> {label}</Text>
}
