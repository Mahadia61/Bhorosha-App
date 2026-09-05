import { useCallback, useEffect, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router, useFocusEffect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/academic'
import type { AppNotification, Course, CourseQuestion, ModerationAppeal, ModerationHistoryItem, ProfessorReview, Profile, Report, Review } from '@/lib/types'

type AdminView = 'overview' | 'courses' | 'members' | 'moderation' | 'analytics'
type ModerationSection = 'reports' | 'questions' | 'responses' | 'appeals' | 'history'
type AdminData = { courses: Course[]; users: Profile[]; reviews: Review[]; professorReviews: ProfessorReview[]; questions: CourseQuestion[]; reports: Report[]; notifications: AppNotification[]; appeals: ModerationAppeal[]; history: ModerationHistoryItem[] }

const emptyAdminData: AdminData = { courses: [], users: [], reviews: [], professorReviews: [], questions: [], reports: [], notifications: [], appeals: [], history: [] }

export default function AdminWorkspace({ initialView }: { initialView?: AdminView }) {
  const { profile } = useApp()
  const [view, setView] = useState<AdminView>(initialView ?? 'overview')
  const [data, setData] = useState<AdminData>(emptyAdminData)
  const [query, setQuery] = useState('')
  const [courseQuery, setCourseQuery] = useState('')
  const [courseDepartment, setCourseDepartment] = useState('all')
  const [courseLevel, setCourseLevel] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [courseTerm, setCourseTerm] = useState<'all' | '1' | '2'>('all')
  const [courseStatus, setCourseStatus] = useState<'all' | 'active' | 'archived' | 'draft'>('all')
  const [courseFilterOpen, setCourseFilterOpen] = useState(false)
  const [draftCourseDepartment, setDraftCourseDepartment] = useState('all')
  const [draftCourseLevel, setDraftCourseLevel] = useState<'all' | '1' | '2' | '3' | '4'>('all')
  const [draftCourseTerm, setDraftCourseTerm] = useState<'all' | '1' | '2'>('all')
  const [draftCourseStatus, setDraftCourseStatus] = useState<'all' | 'active' | 'archived' | 'draft'>('all')
  const [memberRole, setMemberRole] = useState<'all' | 'student' | 'teacher' | 'suspended' | 'pending'>('all')
  const [moderationSection, setModerationSection] = useState<ModerationSection>('reports')
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [courses, users, reviews, professorReviews, questions, reports, notifications, appeals, history] = await Promise.all([
        services.courses(), services.adminUsers(), services.allReviews(), services.allProfessorReviews(), services.allCourseQuestions(), services.allReports(), services.adminNotifications(), services.appeals(), services.moderationHistory(),
      ])
      setData({ courses, users, reviews, professorReviews, questions, reports, notifications, appeals, history })
    } catch (reason) {
      setData(emptyAdminData)
      setLoadError(reason instanceof Error ? reason.message : 'Unable to load the admin workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    void load()
  }, [load]))
  useEffect(() => {
    if (profile?.role !== 'admin') return
    const handleRealtimeError = (reason: Error) => setLoadError(reason.message)
    const unsubscribeReports = services.subscribeAllReports(reports => setData(current => ({ ...current, reports })), handleRealtimeError)
    const unsubscribeNotifications = services.subscribeAdminNotifications(notifications => setData(current => ({ ...current, notifications })), handleRealtimeError)
    return () => {
      unsubscribeReports()
      unsubscribeNotifications()
    }
  }, [profile?.role])
  useEffect(() => { if (initialView) setView(initialView) }, [initialView])

  if (!profile) return <Redirect href="/welcome" />
  if (profile.role !== 'admin') return <Redirect href="/" />

  const removeCourse = (course: Course) => {
    Alert.alert('Archive course?', `${course.code} will no longer appear as active. Its reviews and history will be preserved.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: () => {
        void services.archiveCourse(course)
          .then(() => {
            setData(current => ({ ...current, courses: current.courses.map(item => item.id === course.id ? { ...item, status: 'archived' } : item) }))
            Alert.alert('Course archived', `${course.code} is archived and its history is preserved.`)
          })
          .catch(reason => Alert.alert('Could not archive course', reason instanceof Error ? reason.message : 'Please try again.'))
      } },
    ])
  }

  const changeStatus = (user: Profile) => Alert.alert(
    'Suspend student account?',
    user.name,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => { void services.updateUserStatus(user, false).then(load).catch(reason => Alert.alert('Could not suspend student', reason instanceof Error ? reason.message : 'Please try again.')) } },
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
  const reviewMetricAverage = (key: keyof Review['ratings']) => data.reviews.length ? data.reviews.reduce((sum, review) => sum + review.ratings[key], 0) / data.reviews.length : 0
  const departmentInsights = data.users.reduce<Record<string, number>>((counts, user) => { counts[user.department] = (counts[user.department] ?? 0) + 1; return counts }, {})
  const topDepartments = Object.entries(departmentInsights).sort((left, right) => right[1] - left[1]).slice(0, 3)
  const analyticsMonthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const nextMonth = new Date(date)
    nextMonth.setMonth(date.getMonth() + 1)
    return {
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      users: data.users.filter(user => (user.createdAt ?? 0) >= date.getTime() && (user.createdAt ?? 0) < nextMonth.getTime()).length,
      reviews: data.reviews.filter(review => review.createdAt >= date.getTime() && review.createdAt < nextMonth.getTime()).length,
    }
  })
  const userDistribution = [
    { label: 'Students', value: data.users.filter(user => user.role === 'student').length, color: 'bg-brand' },
    { label: 'Teachers', value: data.users.filter(user => user.role === 'teacher').length, color: 'bg-emerald-500' },
    { label: 'Admins', value: data.users.filter(user => user.role === 'admin').length, color: 'bg-amber-500' },
  ]
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: data.reviews.filter(review => Math.round(Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length) === rating).length,
  }))
  const anonymousReviewCount = data.reviews.filter(review => review.anonymous).length
  const namedReviewCount = data.reviews.length - anonymousReviewCount
  const answeredQuestionCount = data.questions.filter(question => (question.answers?.length ?? 0) > 0).length
  const unansweredQuestionCount = data.questions.length - answeredQuestionCount
  const pendingReportCount = data.reports.filter(report => report.status === 'pending').length
  const resolvedReportCount = data.reports.filter(report => report.status !== 'pending').length
  const pendingStudentVerificationCount = data.users.filter(user => user.role === 'student' && user.emailVerified === false).length
  const pendingQuestionCount = unansweredQuestionCount
  const activeStudentCount = data.users.filter(user => user.role === 'student' && user.active !== false).length
  const activeTeacherCount = data.users.filter(user => user.role === 'teacher' && user.active !== false).length
  const filteredCourses = data.courses.filter(course => {
    const textMatches = `${course.code} ${course.title} ${course.department}`.toLowerCase().includes(courseQuery.toLowerCase())
    return textMatches && (courseDepartment === 'all' || course.department === courseDepartment) && (courseLevel === 'all' || course.level === courseLevel) && (courseTerm === 'all' || course.term === courseTerm) && (courseStatus === 'all' || (course.status ?? 'active') === courseStatus)
  })
  const openCourseFilters = () => {
    setDraftCourseDepartment(courseDepartment)
    setDraftCourseLevel(courseLevel)
    setDraftCourseTerm(courseTerm)
    setDraftCourseStatus(courseStatus)
    setCourseFilterOpen(true)
  }
  const applyCourseFilters = () => {
    setCourseDepartment(draftCourseDepartment)
    setCourseLevel(draftCourseLevel)
    setCourseTerm(draftCourseTerm)
    setCourseStatus(draftCourseStatus)
    setCourseFilterOpen(false)
  }
  const recentActivity = [
    ...data.reviews.map(review => ({ label: 'New course review', time: review.createdAt })),
    ...data.questions.map(question => ({ label: 'New course question', time: question.createdAt })),
    ...data.reports.map(report => ({ label: 'New moderation report', time: report.createdAt })),
  ].sort((left, right) => right.time - left.time).slice(0, 5)
  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)
    const reviews = data.reviews.filter(review => review.createdAt >= date.getTime() && review.createdAt < nextDate.getTime()).length
    const questions = data.questions.filter(question => question.createdAt >= date.getTime() && question.createdAt < nextDate.getTime()).length
    const answers = data.questions.reduce((total, question) => total + (question.answers ?? []).filter(answer => answer.createdAt >= date.getTime() && answer.createdAt < nextDate.getTime()).length, 0)
    return { label: date.toLocaleDateString(undefined, { weekday: 'short' }), reviews, questions, answers }
  })
  const averagePlatformRating = data.reviews.length
    ? data.reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / Object.values(review.ratings).length, 0) / data.reviews.length
    : 0
  const verifiedUserPercentage = data.users.length ? `${Math.round(data.users.filter(user => user.emailVerified !== false).length / data.users.length * 100)}%` : 'No data yet'
  const recentAdminActivity = data.history.slice(0, 3).map(item => ({ label: item.summary, time: item.createdAt }))
  const recentCommunityActivity = [
    ...data.reviews.map(review => ({ label: 'New review submitted', detail: data.courses.find(course => course.id === review.courseId)?.code ?? 'Course review', time: review.createdAt })),
    ...data.questions.map(question => ({ label: 'New course question', detail: data.courses.find(course => course.id === question.courseId)?.code ?? 'Course question', time: question.createdAt })),
  ]
  const recentActivityItems = [...recentAdminActivity.map(item => ({ ...item, detail: '' })), ...recentCommunityActivity].sort((left, right) => right.time - left.time).slice(0, 5)
  const navigation: { id: AdminView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: 'overview', label: 'Overview', icon: 'grid' }, { id: 'courses', label: 'Courses', icon: 'book-open' }, { id: 'members', label: 'Members', icon: 'users' }, { id: 'moderation', label: 'Moderation', icon: 'shield' }, { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  ]

  const content = loading
    ? <><Title title="Loading workspace" text="Fetching courses, members, and moderation data." /><Empty title="Loading…" body="Please wait a moment." /></>
    : loadError
      ? <><Title title="Workspace unavailable" text="The platform data could not be loaded." /><Empty title="Could not load data" body={loadError} /><Button className="mt-2" variant="outline" onPress={() => { void load() }}>Try again</Button></>
      : view === 'overview'
    ? <><Title title="Platform overview" text="Understand platform health and what needs attention." /><View className="mt-5 flex-row flex-wrap gap-3"><OverviewMetric title="Total Members" value={data.users.length} detail={`Students ${data.users.filter(user => user.role === 'student').length}`} extra={`Teachers ${data.users.filter(user => user.role === 'teacher').length}`} onPress={() => setView('members')} /><OverviewMetric title="Total Courses" value={data.courses.length} detail={`Active ${data.courses.filter(course => (course.status ?? 'active') === 'active') .length}`} extra={`Archived ${data.courses.filter(course => course.status === 'archived').length}`} onPress={() => setView('courses')} /><OverviewMetric title="Reviews" value={data.reviews.length} detail={`Anonymous ${data.reviews.length ? Math.round(anonymousReviewCount / data.reviews.length * 100) : 0}%`} extra={`Reported ${pendingReportCount}`} onPress={() => setView('analytics')} /><OverviewMetric title="Moderation" value={pendingReportCount} detail="Pending reports" extra={`Resolved ${resolvedReportCount}`} onPress={() => { setModerationSection('reports'); setView('moderation') }} /><OverviewMetric title="Questions" value={data.questions.length} detail={`${pendingQuestionCount} unanswered`} onPress={() => { setModerationSection('questions'); setView('moderation') }} /></View><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Needs attention</Text><Card className="mt-3"><AttentionRow color="text-rose-600" label={`${pendingReportCount} reported item${pendingReportCount === 1 ? '' : 's'} require moderation`} onPress={() => { setModerationSection('reports'); setView('moderation') }} />{pendingStudentVerificationCount ? <AttentionRow color="text-amber-600" label={`${pendingStudentVerificationCount} student email verification${pendingStudentVerificationCount === 1 ? '' : 's'} pending`} onPress={() => { setMemberRole('pending'); setView('members') }} /> : null}<AttentionRow color="text-orange-600" label={`${pendingQuestionCount} unanswered question${pendingQuestionCount === 1 ? '' : 's'}`} onPress={() => { setModerationSection('questions'); setView('moderation') }} /></Card><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Platform health</Text><View className="mt-3 flex-row flex-wrap gap-3"><HealthMetric title="Average rating" value={data.reviews.length ? `${averagePlatformRating.toFixed(1)} / 5` : 'No data yet'} /><HealthMetric title="Active users today" value={data.users.filter(user => user.active !== false).length} /><HealthMetric title="Verified users" value={verifiedUserPercentage} /><HealthMetric title="Teacher feedback" value={teacherAnalytics.length ? `${(teacherAnalytics.reduce((sum, item) => sum + item.average, 0) / teacherAnalytics.length).toFixed(1)} / 5` : 'No data yet'} /></View><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Recent activity</Text><Card className="mt-3">{recentActivityItems.length ? recentActivityItems.map(item => <View key={`${item.label}-${item.time}`} className="border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Text className="text-sm text-ink dark:text-white">{item.label.includes('review') ? '⭐' : item.label.includes('question') ? '💬' : '🟦'} {item.label}</Text>{item.detail ? <Text className="mt-1 text-xs text-muted">{item.detail}</Text> : null}<Text className="mt-1 text-xs text-muted">{formatRelativeTime(item.time)}</Text></View>) : <Text className="py-3 text-sm text-muted">No recent activity yet.</Text>}</Card></>
    : view === 'courses'
      ? <>
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1"><Title title="Course catalogue" text="Review courses and teacher assignments." /></View>
            <Button className="mt-0" onPress={() => router.push('/admin-course-form')}>Add course</Button>
          </View>
          <CourseFilters query={courseQuery} onQuery={setCourseQuery} department={draftCourseDepartment} onDepartment={setDraftCourseDepartment} level={draftCourseLevel} onLevel={setDraftCourseLevel} term={draftCourseTerm} onTerm={setDraftCourseTerm} status={draftCourseStatus} onStatus={setDraftCourseStatus} departments={[...new Set(data.courses.map(course => course.department).filter(Boolean))]} open={courseFilterOpen} onOpen={openCourseFilters} onClose={() => setCourseFilterOpen(false)} onApply={applyCourseFilters} />
          {filteredCourses.length
            ? filteredCourses.map(course => <Card key={course.id} className="mt-4">
                <Text className="text-xs font-bold text-brand">{course.code}</Text>
                <Text className="mt-1 font-semibold text-ink dark:text-white">{course.title}</Text>
                <Text className="mt-1 text-xs text-muted">{academicLabel(course.level, course.term)} · {course.courseType ?? 'Type not set'} · {course.credits} credits</Text><Text className="mt-2 text-xs font-semibold text-emerald-600">Status: {(course.status ?? 'active').charAt(0).toUpperCase() + (course.status ?? 'active').slice(1)}</Text>
                <Text className="mt-2 text-xs text-muted">{course.teacherNames.join(', ') || 'No teacher assigned'}</Text>
                {course.tags.length ? <Text className="mt-2 text-xs text-brand">{course.tags.join(' · ')}</Text> : null}
                {data.reviews.filter(review => review.courseId === course.id).slice(0, 2).map(review => <View key={review.id} className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><Text className="text-xs font-semibold text-ink dark:text-white">Latest review</Text><Text numberOfLines={2} className="mt-1 text-xs text-muted">"{review.text}"</Text></View>)}
                <View className="mt-4 flex-row flex-wrap justify-between gap-3"><Pressable accessibilityRole="button" onPress={() => setSelectedCourse(course)}><Text className="text-sm font-semibold text-brand">View details</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/admin-course-form', params: { courseId: course.id } })}><Text className="text-sm font-semibold text-brand">Edit</Text></Pressable>{course.status !== 'archived' ? <Pressable accessibilityRole="button" accessibilityLabel={`Archive ${course.code} ${course.title}`} onPress={() => removeCourse(course)} className="rounded-lg px-3 py-2"><Text className="text-sm font-semibold text-amber-600">Archive</Text></Pressable> : null}</View>
              </Card>)
            : <Empty title="No courses yet" body="Add the first course to start assigning teachers." />}
        </>
      : view === 'members'
        ? <><Title title="Member management" text="View members. Only active student accounts can be suspended." /><MemberFilters value={memberRole} onChange={setMemberRole} /><Search value={query} onChange={setQuery} />{data.users.filter(user => (memberRole === 'all' || (memberRole === 'pending' ? user.role === 'student' && user.emailVerified === false : memberRole === 'suspended' ? user.role === 'student' && user.active === false : user.role === memberRole)) && `${user.name} ${user.email} ${user.department}`.toLowerCase().includes(query.toLowerCase())).map(user => <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={`View profile for ${user.name}`} onPress={() => setSelectedMember(user)}><Card className="mt-3"><Text className="font-semibold text-ink dark:text-white">{user.name}</Text><Text className="mt-1 text-xs text-muted">{user.email}</Text><Text className="mt-2 text-xs font-bold text-brand">{user.role.toUpperCase()} · {user.department}</Text>{user.role === 'student' && user.emailVerified === false ? <Text className="mt-2 text-xs text-amber-600">Student email verification pending</Text> : null}{user.active === false ? <Text className="mt-1 text-xs text-amber-600">Account suspended</Text> : null}{user.warningCount ? <Text className="mt-1 text-xs text-amber-600">{user.warningCount} moderation warning{user.warningCount === 1 ? '' : 's'}</Text> : null}{user.role === 'student' && user.active !== false ? <Text onPress={() => changeStatus(user)} className="mt-3 text-sm font-semibold text-rose-600">Suspend student</Text> : null}</Card></Pressable>)}</>
        : view === 'moderation'
          ? <><Title title="Moderation" text="Protect trust with transparent, reversible decisions." /><ModerationFilters value={moderationSection} onChange={setModerationSection} />{moderationSection === 'reports' ? data.reports.filter(report => report.status === 'pending').map(report => <ReportCard key={report.id} report={report} data={data} onResolved={load} />) : moderationSection === 'questions' ? <QuestionQueue questions={data.questions} /> : moderationSection === 'responses' ? <TeacherResponses reviews={data.reviews} professorReviews={data.professorReviews} /> : moderationSection === 'appeals' ? <AppealList appeals={data.appeals} onUpdate={async (id, status) => { await services.updateAppealStatus(id, status); await load() }} /> : data.history.length ? data.history.map(item => <Card key={item.id} className="mt-3"><Text className="font-semibold text-ink dark:text-white">{item.summary}</Text><Text className="mt-1 text-xs text-muted">{item.action.toUpperCase()} · {formatRelativeTime(item.createdAt)}</Text></Card>) : <Empty title="No moderation history yet" body="Resolved moderation actions will appear here." />}</>
          : <><Title title="Analytics" text="Understand users, courses, teachers, and feedback." /><AnalyticsSummaryCards users={data.users} reviews={data.reviews} courses={data.courses} teacherAnalytics={teacherAnalytics} /><SectionHeading title="User growth trend" /><Card className="mt-3"><Text className="text-xs text-muted">New members by month</Text><TrendChart points={analyticsMonthly} valueKey="users" color="bg-brand" /></Card><SectionHeading title="User distribution" /><DistributionCard values={userDistribution} total={data.users.length} /><SectionHeading title="Course performance" /><Card className="mt-3"><Text className="text-xs text-muted">Most reviewed courses</Text>{courseAnalytics.length ? courseAnalytics.slice(0, 5).map(item => <View key={item.course.id} className="mt-3 flex-row items-center justify-between"><View className="flex-1"><Text className="text-sm font-semibold text-ink dark:text-white">{item.course.code}</Text><Text className="mt-1 text-xs text-muted">{item.count} review{item.count === 1 ? '' : 's'}</Text></View><View className="items-end"><Stars value={item.average} /><Text className="mt-1 text-xs text-muted">{item.average ? item.average.toFixed(1) : '—'} / 5</Text></View></View>) : <Empty title="No course analytics yet" body="Course feedback will appear here after students submit reviews." />}<Text className="mt-5 text-xs font-semibold text-muted">Top departments</Text>{topDepartments.length ? topDepartments.map(([department, count]) => <View key={department} className="mt-2 flex-row justify-between"><Text className="text-sm text-ink dark:text-white">{department || 'Unassigned'}</Text><Text className="text-sm font-semibold text-brand">{data.users.length ? Math.round(count / data.users.length * 100) : 0}%</Text></View>) : <Text className="mt-2 text-sm text-muted">No department data yet.</Text>}</Card><SectionHeading title="Review analytics" /><Card className="mt-3"><MetricGrid values={[['Total reviews', data.reviews.length], ['Anonymous', `${data.reviews.length ? Math.round(anonymousReviewCount / data.reviews.length * 100) : 0}%`], ['Questions', data.questions.length], ['Answered', answeredQuestionCount]]} /><Text className="mt-4 text-xs font-semibold text-muted">Rating distribution</Text><RatingChart values={ratingDistribution} total={data.reviews.length} /><Text className="mt-5 text-xs font-semibold text-muted">Reviews per month</Text><TrendChart points={analyticsMonthly} valueKey="reviews" color="bg-emerald-500" /></Card><SectionHeading title="Platform activity" /><Card className="mt-3"><Text className="text-xs text-muted">Reviews, questions, and answers over the last 7 days.</Text><ActivityChart days={activityDays} /></Card><SectionHeading title="Teacher performance" /><Card className="mt-3">{teacherAnalytics.length ? <>{teacherAnalytics.slice(0, 8).map(item => <View key={item.teacher.id} className="mt-3 flex-row items-center justify-between"><View className="flex-1"><Text className="text-sm font-semibold text-ink dark:text-white">{item.teacher.name}</Text><Text className="mt-1 text-xs text-muted">{item.courseCount} course{item.courseCount === 1 ? '' : 's'} · {item.count} review{item.count === 1 ? '' : 's'}</Text></View><View className="items-end"><Stars value={item.average} /><Text className="mt-1 text-xs text-muted">{item.average ? item.average.toFixed(1) : '—'} / 5</Text></View></View>)}</> : <Empty title="No teacher analytics yet" body="Teacher performance will appear here after profile feedback is submitted." />}</Card></>

  const unreadNotificationCount = data.notifications.filter(item => !item.read).length
  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingBottom: 40 }}><View className="bg-brand px-5 pb-6 pt-4"><View className="flex-row items-start justify-between gap-4"><View className="flex-1"><Text className="text-2xl font-bold text-white">Bhorosha Admin</Text><Text className="mt-1 text-sm text-blue-100">Courses, members, moderation, and analytics.</Text></View><View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => router.push('/admin-notifications' as never)} className="relative h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Feather name="bell" size={19} color="white" />{unreadNotificationCount ? <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-rose-500 px-1.5 py-0.5"><Text className="text-[10px] font-bold text-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</Text></View> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open admin profile menu" onPress={() => setProfileMenuOpen(true)} className="h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Text className="text-base font-bold text-white">{profile.name.trim().charAt(0).toUpperCase() || 'A'}</Text></Pressable></View></View></View>{!initialView ? <View className="flex-row flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">{navigation.map(item => <Pressable key={item.id} onPress={() => setView(item.id)} className={`flex-row items-center gap-1 rounded-lg px-2 py-2 ${view === item.id ? 'bg-blue-50' : ''}`}><Feather name={item.icon} size={14} color="#4F7EF7" /><Text className="text-xs font-semibold text-brand">{item.label}</Text></Pressable>)}</View> : null}<View className="px-5 pt-5">{content}</View></ScrollView><AdminMenu visible={profileMenuOpen} onClose={() => setProfileMenuOpen(false)} /><MemberProfileModal member={selectedMember} courses={data.courses} reviews={data.reviews} questions={data.questions} reports={data.reports} onClose={() => setSelectedMember(null)} /><CourseDetailsModal course={selectedCourse} reviews={data.reviews} onClose={() => setSelectedCourse(null)} /></SafeAreaView>
}

function Title({ title, text }: { title: string; text: string }) { return <><Text className="text-xl font-bold text-ink dark:text-white">{title}</Text><Text className="mt-1 text-sm text-muted">{text}</Text></> }
function MetricGrid({ values }: { values: [string, string | number][] }) { return <View className="mt-5 flex-row flex-wrap gap-3">{values.map(([label, value]) => <Card key={label} className="w-[47%] p-4"><Text className="text-2xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">{label}</Text></Card>)}</View> }
function AttentionRow({ color, label, onPress }: { color: string; label: string; onPress: () => void }) { return <Pressable onPress={onPress} className="border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Text className={`text-sm font-medium ${color}`}>{label}</Text></Pressable> }
function formatRelativeTime(timestamp: number) { const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000)); return minutes < 60 ? `${minutes} minute${minutes === 1 ? '' : 's'} ago` : `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? '' : 's'} ago` }
function OverviewMetric({ title, value, detail, extra, onPress }: { title: string; value: number; detail: string; extra?: string; onPress: () => void }) { return <Pressable onPress={onPress} className="w-[47%]"><Card className="h-full p-4"><Text className="text-xs font-semibold text-muted">{title}</Text><Text className="mt-2 text-2xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">{detail}</Text>{extra ? <Text className="mt-1 text-xs font-semibold text-brand">{extra}</Text> : null}</Card></Pressable> }
function HealthMetric({ title, value }: { title: string; value: string | number }) { return <Card className="w-[47%] p-4"><Text className="text-xs text-muted">{title}</Text><Text className="mt-2 text-lg font-bold text-ink dark:text-white">{value}</Text></Card> }
function TrendChart({ points, valueKey, color }: { points: { label: string; users: number; reviews: number }[]; valueKey: 'users' | 'reviews'; color: string }) { const max = Math.max(1, ...points.map(point => point[valueKey])); return <View className="mt-4"><View className="h-24 flex-row items-end gap-1">{points.map(point => <View key={point.label} className="flex-1 items-center"><View style={{ height: `${Math.max(point[valueKey] / max * 100, point[valueKey] ? 8 : 2)}%` }} className={`w-full rounded-t ${color}`} /><Text className="mt-1 text-[9px] text-muted">{point.label}</Text></View>)}</View></View> }
function SectionHeading({ title }: { title: string }) { return <Text className="mt-7 text-lg font-bold text-ink dark:text-white">{title}</Text> }
function AnalyticsSummaryCards({ users, reviews, courses, teacherAnalytics }: { users: Profile[]; reviews: Review[]; courses: Course[]; teacherAnalytics: { average: number }[] }) {
  const anonymous = reviews.filter(review => review.anonymous).length
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / Object.values(review.ratings).length, 0) / reviews.length : 0
  const activeTeachers = users.filter(user => user.role === 'teacher' && user.active !== false).length
  const teacherAverage = teacherAnalytics.length ? teacherAnalytics.reduce((sum, item) => sum + item.average, 0) / teacherAnalytics.length : 0
  return <View className="mt-5 gap-3"><InsightCard icon="👥" title="Users" value={users.length} lines={[`Students ${users.filter(user => user.role === 'student').length}`, `Teachers ${users.filter(user => user.role === 'teacher').length}`, `Active today ${users.filter(user => user.active !== false).length}`]} /><InsightCard icon="⭐" title="Reviews" value={reviews.length} lines={[`Avg rating ${reviews.length ? average.toFixed(1) : 'No data'}`, `Anonymous ${reviews.length ? Math.round(anonymous / reviews.length * 100) : 0}%`]} /><InsightCard icon="📚" title="Courses" value={courses.length} lines={[`Active ${courses.filter(course => (course.status ?? 'active') === 'active').length}`, `Archived ${courses.filter(course => course.status === 'archived').length}`]} /><InsightCard icon="👨‍🏫" title="Teachers" value={users.filter(user => user.role === 'teacher').length} lines={[`Active ${activeTeachers}`, `Avg rating ${teacherAnalytics.length ? teacherAverage.toFixed(1) : 'No data'}`]} /></View>
}
function InsightCard({ icon, title, value, lines }: { icon: string; title: string; value: number; lines: string[] }) { return <Card className="p-4"><Text className="text-sm font-semibold text-ink dark:text-white">{icon} {title}</Text><Text className="mt-3 text-3xl font-bold text-ink dark:text-white">{value}</Text><Text className="mt-1 text-xs text-muted">Total {title.toLowerCase()}</Text>{lines.map(line => <Text key={line} className="mt-2 text-xs text-muted">{line}</Text>)}</Card> }
function DistributionCard({ values, total }: { values: { label: string; value: number; color: string }[]; total: number }) { return <Card className="mt-3"><View className="items-center"><View className="h-32 w-32 items-center justify-center rounded-full border-[18px] border-slate-200 dark:border-slate-700"><View className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-slate-900"><Text className="text-xs font-semibold text-muted">Users</Text></View></View></View><View className="mt-5 gap-3">{values.map(item => <View key={item.label} className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className={`h-2.5 w-2.5 rounded-full ${item.color}`} /><Text className="text-sm text-ink dark:text-white">{item.label}</Text></View><Text className="text-sm font-semibold text-muted">{total ? Math.round(item.value / total * 100) : 0}%</Text></View>)}</View></Card> }
function RatingChart({ values, total }: { values: { rating: number; count: number }[]; total: number }) { const max = Math.max(1, ...values.map(item => item.count)); return <View className="mt-3 gap-3">{values.map(item => <View key={item.rating} className="flex-row items-center gap-2"><Text className="w-8 text-xs text-muted">{item.rating} ⭐</Text><View className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><View style={{ width: `${item.count / max * 100}%` }} className="h-full rounded-full bg-amber-500" /></View><Text className="w-12 text-right text-xs text-muted">{total ? Math.round(item.count / total * 100) : 0}%</Text></View>)}</View> }
function MemberFilters({ value, onChange }: { value: 'all' | 'student' | 'teacher' | 'suspended' | 'pending'; onChange: (value: 'all' | 'student' | 'teacher' | 'suspended' | 'pending') => void }) { return <View className="mt-5 flex-row flex-wrap gap-2">{(['all', 'student', 'teacher', 'suspended', 'pending'] as const).map(item => <Pressable key={item} onPress={() => onChange(item)} className={`rounded-lg border px-3 py-2 ${value === item ? 'border-brand bg-blue-50' : 'border-slate-200 dark:border-slate-700'}`}><Text className="text-xs font-semibold capitalize text-brand">{item === 'all' ? 'All users' : item === 'pending' ? 'Pending student verification' : item === 'suspended' ? 'Suspended users' : `${item}s`}</Text></Pressable>)}</View> }
function CourseFilters({ query, onQuery, department, onDepartment, level, onLevel, term, onTerm, status, onStatus, departments, open, onOpen, onClose, onApply }: { query: string; onQuery: (value: string) => void; department: string; onDepartment: (value: string) => void; level: 'all' | '1' | '2' | '3' | '4'; onLevel: (value: 'all' | '1' | '2' | '3' | '4') => void; term: 'all' | '1' | '2'; onTerm: (value: 'all' | '1' | '2') => void; status: 'all' | 'active' | 'archived' | 'draft'; onStatus: (value: 'all' | 'active' | 'archived' | 'draft') => void; departments: string[]; open: boolean; onOpen: () => void; onClose: () => void; onApply: () => void }) {
  return <View className="mt-5 flex-row items-center gap-2">
    <View className="flex-1"><Search value={query} onChange={onQuery} placeholder="Search courses" className="mt-0" /></View>
    <Pressable onPress={onOpen} className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
      <Feather name="sliders" size={16} color="#4F7EF7" />
      <Text className="text-sm font-semibold text-brand">Filter</Text>
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white p-5 dark:bg-slate-900">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-ink dark:text-white">Filter Courses</Text>
            <Pressable onPress={onClose}><Feather name="x" size={22} color="#64748B" /></Pressable>
          </View>
          <FilterGroup label="Department" value={department} options={['all', ...departments]} onChange={onDepartment} />
          <FilterGroup label="Year" value={level} options={['all', '1', '2', '3', '4']} labels={{ all: 'All', '1': '1st', '2': '2nd', '3': '3rd', '4': '4th' }} onChange={value => onLevel(value as typeof level)} />
          <FilterGroup label="Semester" value={term} options={['all', '1', '2']} onChange={value => onTerm(value as typeof term)} />
          <FilterGroup label="Status" value={status} options={['all', 'active', 'archived', 'draft']} onChange={value => onStatus(value as typeof status)} />
          <Button className="mt-6" onPress={onApply}>Apply</Button>
        </View>
      </View>
    </Modal>
  </View>
}
function FilterGroup({ label, value, options, labels, onChange }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) { return <View className="mt-5"><Text className="mb-2 text-sm font-semibold text-ink dark:text-white">{label}</Text><View className="flex-row flex-wrap gap-2">{options.map(option => <Pressable key={option} onPress={() => onChange(option)} className={`flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${value === option ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}><View className={`h-4 w-4 rounded-full border-2 ${value === option ? 'border-brand bg-brand' : 'border-slate-300 dark:border-slate-600'}`} /><Text className="text-sm text-ink dark:text-white">{labels?.[option] ?? (option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1))}</Text></Pressable>)}</View></View> }
function FilterChoice({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) { return <View className="flex-row flex-wrap gap-1">{options.map(option => <Pressable key={option} onPress={() => onChange(option)} className={`rounded-lg px-2.5 py-1.5 ${value === option ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-[11px] capitalize ${value === option ? 'text-white' : 'text-muted'}`}>{option === 'all' ? 'All' : option}</Text></Pressable>)}</View> }
function MemberProfileModal({ member, courses, reviews, questions, reports, onClose }: { member: Profile | null; courses: Course[]; reviews: Review[]; questions: CourseQuestion[]; reports: Report[]; onClose: () => void }) { if (!member) return null; const assignedCourses = courses.filter(course => course.teacherIds.includes(member.id)); const reviewCount = member.role === 'teacher' ? dataReviewsForTeacher(member, reviews).length : reviews.length; const questionCount = member.role === 'student' ? questions.length : 0; const reportCount = reports.length; return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[88%] rounded-t-3xl bg-white p-5 dark:bg-slate-900"><ScrollView><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-ink dark:text-white">Profile details</Text><Pressable onPress={onClose}><Feather name="x" size={22} color="#64748B" /></Pressable></View><View className="mt-5 items-center"><View className="h-20 w-20 items-center justify-center rounded-full bg-brand"><Text className="text-3xl font-bold text-white">{member.name.trim().charAt(0).toUpperCase() || '?'}</Text></View><Text className="mt-3 text-lg font-bold text-ink dark:text-white">{member.name}</Text><Text className="mt-1 text-sm text-muted">{member.email}</Text><Text className="mt-1 text-xs font-bold uppercase text-brand">{member.role}</Text></View><ProfileDetail label="Department" value={member.department} /><ProfileDetail label="Account status" value={member.active === false ? 'Suspended' : 'Active'} /><ProfileDetail label="Email verification" value={member.role === 'teacher' ? 'Verified' : member.emailVerified ? 'Verified' : 'Not verified'} /><ProfileDetail label="Reviews written / received" value={String(reviewCount)} /><ProfileDetail label="Questions asked" value={String(questionCount)} /><ProfileDetail label="Reports received" value={String(reportCount)} />{member.designation ? <ProfileDetail label="Designation" value={member.designation} /> : null}{member.bio ? <ProfileDetail label="Bio" value={member.bio} /> : null}{member.studentId ? <ProfileDetail label="Student ID" value={member.studentId} /> : null}{member.batch ? <ProfileDetail label="Batch" value={member.batch} /> : null}{member.currentLevel || member.currentTerm ? <ProfileDetail label="Academic level" value={`Level ${member.currentLevel ?? '—'} · Term ${member.currentTerm ?? '—'}`} /> : null}<ProfileDetail label="Warnings" value={String(member.warningCount ?? 0)} /><ProfileDetail label="Suspensions" value={member.active === false ? '1 current suspension' : '0'} />{member.role === 'teacher' ? <><Text className="mt-6 text-base font-bold text-ink dark:text-white">Assigned courses</Text>{assignedCourses.length ? assignedCourses.map(course => <Text key={course.id} className="mt-2 text-sm text-muted">{course.code} · {course.title}</Text>) : <Text className="mt-2 text-sm text-muted">No courses assigned.</Text>}</> : null}</ScrollView></View></View></Modal> }
function dataReviewsForTeacher(member: Profile, reviews: Review[]) { return reviews.filter(review => review.responses?.some(response => response.teacherName === member.name)) }
function ProfileDetail({ label, value }: { label: string; value: string }) { return <View className="mt-4 border-b border-slate-100 pb-3 dark:border-slate-800"><Text className="text-xs font-semibold uppercase text-muted">{label}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{value || 'Not provided'}</Text></View> }
function CourseDetailsModal({ course, reviews, onClose }: { course: Course | null; reviews: Review[]; onClose: () => void }) { if (!course) return null; const courseReviews = reviews.filter(review => review.courseId === course.id); const average = courseReviews.length ? courseReviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, rating) => total + rating, 0) / Object.values(review.ratings).length, 0) / courseReviews.length : 0; const metric = (key: keyof Review['ratings']) => courseReviews.length ? courseReviews.reduce((sum, review) => sum + review.ratings[key], 0) / courseReviews.length : 0; return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[90%] rounded-t-3xl bg-white p-5 dark:bg-slate-900"><ScrollView><View className="flex-row items-center justify-between"><Text className="text-xl font-bold text-ink dark:text-white">Course details</Text><Pressable onPress={onClose}><Feather name="x" size={22} color="#64748B" /></Pressable></View><Text className="mt-5 text-sm font-bold text-brand">{course.code}</Text><Text className="mt-1 text-2xl font-bold text-ink dark:text-white">{course.title}</Text><ProfileDetail label="Department" value={course.department} /><ProfileDetail label="Credits" value={String(course.credits)} /><ProfileDetail label="Level and term" value={`Level ${course.level ?? '—'} · Term ${course.term ?? '—'}`} /><ProfileDetail label="Teachers" value={course.teacherNames.join(', ') || 'None assigned'} /><ProfileDetail label="Status" value={(course.status ?? 'active').toUpperCase()} /><Text className="mt-6 text-base font-bold text-ink dark:text-white">Course analytics</Text><ProfileDetail label="Total reviews" value={String(courseReviews.length)} /><ProfileDetail label="Average rating" value={`${average.toFixed(1)} / 5`} /><ProfileDetail label="Teaching quality" value={`${metric('teachingQuality').toFixed(1)} / 5`} /><ProfileDetail label="Workload" value={`${metric('workload').toFixed(1)} / 5`} /><ProfileDetail label="Difficulty" value={`${metric('difficulty').toFixed(1)} / 5`} /><Text className="mt-6 text-base font-bold text-ink dark:text-white">Recent reviews</Text>{courseReviews.slice(0, 5).map(review => <Text key={review.id} className="mt-3 text-sm leading-5 text-muted">"{review.text}"</Text>)}</ScrollView></View></View></Modal> }
function ModerationFilters({ value, onChange }: { value: ModerationSection; onChange: (value: ModerationSection) => void }) { return <View className="mt-5 flex-row flex-wrap gap-2">{(['reports', 'questions', 'responses', 'appeals', 'history'] as const).map(item => <Pressable key={item} onPress={() => onChange(item)} className={`rounded-lg border px-3 py-2 ${value === item ? 'border-brand bg-blue-50' : 'border-slate-200 dark:border-slate-700'}`}><Text className="text-xs font-semibold capitalize text-brand">{item === 'reports' ? 'Reported content' : item === 'questions' ? 'Questions' : item === 'responses' ? 'Teacher responses' : item}</Text></Pressable>)}</View> }
function QuestionQueue({ questions }: { questions: CourseQuestion[] }) { const pending = questions.filter(question => !(question.answers?.length)); return pending.length ? <>{pending.map(question => <Card key={question.id} className="mt-3"><Text className="text-xs font-bold text-brand">{question.category}</Text><Text className="mt-2 text-sm leading-5 text-ink dark:text-white">{question.text}</Text><Text className="mt-2 text-xs text-muted">Unanswered · {formatRelativeTime(question.createdAt)}</Text></Card>)}</> : <Empty title="No unanswered questions" body="All course questions currently have at least one answer." /> }
function TeacherResponses({ reviews, professorReviews }: { reviews: Review[]; professorReviews: ProfessorReview[] }) { const responses = [...reviews.flatMap(review => (review.responses ?? []).map(response => ({ ...response, target: 'Course review' }))), ...professorReviews.flatMap(review => (review.responses ?? []).map(response => ({ ...response, target: 'Teacher review' })))] ; return responses.length ? <>{responses.map(response => <Card key={response.id} className="mt-3"><Text className="text-xs font-bold text-brand">{response.target} · {response.teacherName}</Text><Text className="mt-2 text-sm text-ink dark:text-white">{response.text}</Text><Text className="mt-2 text-xs text-muted">{formatRelativeTime(response.createdAt)}</Text></Card>)}</> : <Empty title="No teacher responses yet" body="Teacher replies to published feedback will appear here for moderation." /> }
function AppealList({ appeals, onUpdate }: { appeals: ModerationAppeal[]; onUpdate: (id: string, status: ModerationAppeal['status']) => Promise<void> }) { return appeals.length ? <>{appeals.map(appeal => <Card key={appeal.id} className="mt-3"><Text className="font-semibold text-ink dark:text-white">Appeal for report {appeal.reportId}</Text><Text className="mt-2 text-sm text-muted">{appeal.reason}</Text><Text className="mt-2 text-xs text-muted">{appeal.status.toUpperCase()} · {formatRelativeTime(appeal.createdAt)}</Text>{appeal.status === 'pending' ? <View className="mt-3 flex-row gap-4"><Pressable onPress={() => { void onUpdate(appeal.id, 'accepted') }}><Text className="text-sm font-semibold text-brand">Accept</Text></Pressable><Pressable onPress={() => { void onUpdate(appeal.id, 'rejected') }}><Text className="text-sm font-semibold text-rose-600">Reject</Text></Pressable></View> : null}</Card>)}</> : <Empty title="No appeals yet" body="Appeals submitted by community members will appear here." /> }
function AdminMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) { const { signOut } = useApp(); const open = (path: string) => { onClose(); router.push(path as never) }; const logout = async () => { onClose(); await signOut(); router.replace('/welcome') }; return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable className="flex-1 bg-black/30" onPress={onClose}><View className="absolute right-5 top-24 w-56 rounded-2xl bg-white p-2 shadow-lg dark:bg-slate-900">{[['user', 'Admin Profile', '/admin-profile'], ['clock', 'Activity Log', '/admin-activity'], ['settings', 'Settings', '/admin-settings'], ['lock', 'Security', '/admin-security']].map(([icon, label, path]) => <Pressable key={label} onPress={() => open(path)} className="flex-row items-center gap-3 rounded-xl px-3 py-3"><Feather name={icon as keyof typeof Feather.glyphMap} size={17} color="#4F7EF7" /><Text className="text-sm font-medium text-ink dark:text-white">{label}</Text></Pressable>)}<Pressable onPress={() => { void logout() }} className="flex-row items-center gap-3 rounded-xl px-3 py-3"><Feather name="log-out" size={17} color="#E11D48" /><Text className="text-sm font-medium text-rose-600">Logout</Text></Pressable></View></Pressable></Modal> }
function ActivityChart({ days, reviewsOnly = false }: { days: { label: string; reviews: number; questions: number; answers: number }[]; reviewsOnly?: boolean }) {
  const max = Math.max(1, ...days.flatMap(day => [day.reviews, day.questions, day.answers]))
  return <View className="mt-5">
    <View className="flex-row items-end justify-between gap-2">
      {days.map(day => <View key={day.label} className="flex-1 items-center">
        <View className="h-32 w-full flex-row items-end justify-center gap-0.5">
          <View style={{ height: `${Math.max(day.reviews / max * 100, day.reviews ? 8 : 2)}%` }} className="w-1/4 rounded-t bg-brand" />
          {!reviewsOnly ? <View style={{ height: `${Math.max(day.questions / max * 100, day.questions ? 8 : 2)}%` }} className="w-1/4 rounded-t bg-amber-500" /> : null}
          {!reviewsOnly ? <View style={{ height: `${Math.max(day.answers / max * 100, day.answers ? 8 : 2)}%` }} className="w-1/4 rounded-t bg-emerald-500" /> : null}
        </View>
        <Text className="mt-2 text-[10px] text-muted">{day.label}</Text>
      </View>)}
    </View>
    <View className="mt-4 flex-row gap-4"><Legend color="bg-brand" label="Reviews" />{!reviewsOnly ? <><Legend color="bg-amber-500" label="Questions" /><Legend color="bg-emerald-500" label="Answers" /></> : null}</View>
  </View>
}
function Legend({ color, label }: { color: string; label: string }) { return <View className="flex-row items-center gap-1"><View className={`h-2 w-2 rounded-full ${color}`} /><Text className="text-xs text-muted">{label}</Text></View> }
function Search({ value, onChange, placeholder = 'Search members', className = 'mt-5' }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) { return <View className={`${className} flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900`}><Feather name="search" size={17} color="#64748B" /><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#94A3B8" className="flex-1 px-2 py-3 text-ink dark:text-white" /></View> }

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
  return <Card className="mt-3"><Text className="text-xs font-bold text-brand">REPORT #{report.id.slice(0, 8)} · {report.contentType.toUpperCase()} · {report.status.toUpperCase()}</Text><Text className="mt-2 text-xs text-rose-600">Reported for: {report.reason}</Text><Text className="mt-2 leading-5 text-ink dark:text-white">{content ?? 'The reported content is no longer available.'}</Text><View className="mt-4 flex-row flex-wrap gap-3"><Text onPress={() => { void resolve('kept') }} className="text-sm font-semibold text-brand">Keep review</Text><Text onPress={() => { void resolve('hidden') }} className="text-sm font-semibold text-amber-600">Hide review</Text><Text onPress={() => Alert.alert('Warn account?', 'This creates a private account warning without revealing the author in the app.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Warn', style: 'destructive', onPress: () => { void resolve('warned') } }])} className="text-sm font-semibold text-orange-600">Take action</Text><Text onPress={() => Alert.alert('Remove content?', 'This removes the public community record and preserves the moderation history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => { void resolve('removed', true) } }])} className="text-sm font-semibold text-rose-600">Remove content</Text></View></Card>
}
