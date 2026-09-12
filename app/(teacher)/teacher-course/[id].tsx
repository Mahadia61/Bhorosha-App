import { teachesCourse } from '@/features/courses'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppBottomNav, Card, Empty, PageHeader, Screen, SearchBar } from '@/components/ui'
import { colors } from '@/components/ui/theme'
import { courseService } from '@/features/courses'
import { questionService } from '@/features/questions'
import { reviewService } from '@/features/reviews'
import { userService } from '@/features/users'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/utils/academic'
import { goBack } from '@/lib/utils/navigation'
import type { Course, CourseGuide, CourseQuestion, Professor, Review } from '@/types'
import {
  InfoRow,
  RatingSummary,
  SortMenu,
  TeacherAdviceCard,
  TeacherCourseHero,
  TeacherQuestionCard,
  TeacherReviewCard,
  TeacherRow,
  UnderlineTabs,
  reviewAverage,
} from '@/components/teacher/teacher-ui'
import { Feather } from '@expo/vector-icons'

type Tab = 'overview' | 'reviews' | 'questions' | 'advice'
type ReviewSort = 'recent' | 'highest'
type QuestionFilter = 'all' | 'unanswered' | 'answered'
type QuestionSort = 'recent' | 'answers'
type AdviceSort = 'recent' | 'title'

const tabs: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'questions', label: 'Q&A' },
  { key: 'advice', label: 'Advice' },
]

export default function TeacherCourseDetail() {
  const { id, tab: requestedTab } = useLocalSearchParams<{ id: string; tab?: string }>()
  const { profile } = useApp()
  const [course, setCourse] = useState<Course | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [guides, setGuides] = useState<CourseGuide[]>([])
  const [teachers, setTeachers] = useState<Professor[]>([])
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : 'overview')
  const [loading, setLoading] = useState(true)
  const [reviewSearch, setReviewSearch] = useState('')
  const [reviewSort, setReviewSort] = useState<ReviewSort>('recent')
  const [questionSearch, setQuestionSearch] = useState('')
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('all')
  const [questionSort, setQuestionSort] = useState<QuestionSort>('recent')
  const [adviceSearch, setAdviceSearch] = useState('')
  const [adviceSort, setAdviceSort] = useState<AdviceSort>('recent')
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!profile) return
    try {
      const nextCourse = await courseService.course(id)
      if (!nextCourse || !teachesCourse(nextCourse, profile)) throw new Error('This course is not assigned to you.')
      const [nextReviews, nextQuestions, nextGuides, directory] = await Promise.all([
        reviewService.reviews(id),
        questionService.courseQuestions(id),
        courseService.courseGuides(id),
        userService.professors(),
      ])
      setCourse(nextCourse)
      setReviews(nextReviews)
      setQuestions(nextQuestions)
      setGuides(nextGuides)
      const names = new Map(directory.map(teacher => [teacher.id, teacher]))
      setTeachers(nextCourse.teacherIds.map((teacherId, index) => names.get(teacherId) ?? {
        id: teacherId,
        name: nextCourse.teacherNames[index] ?? 'Course teacher',
        department: nextCourse.department,
        designation: 'Course teacher',
      }))
    } catch (reason) {
      Alert.alert('Could not load course', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, profile])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (isTab(requestedTab)) setTab(requestedTab) }, [requestedTab])

  const visibleReviews = useMemo(() => reviews
    .filter(review => `${review.text} ${review.displayName ?? ''}`.toLowerCase().includes(reviewSearch.toLowerCase()))
    .sort((left, right) => reviewSort === 'highest' ? reviewAverage(right) - reviewAverage(left) : right.createdAt - left.createdAt), [reviews, reviewSearch, reviewSort])

  const visibleQuestions = useMemo(() => questions
    .filter(question => {
      const answered = (question.answers ?? []).some(answer => answer.authorRole === 'teacher')
      const matches = question.text.toLowerCase().includes(questionSearch.toLowerCase()) || question.category.toLowerCase().includes(questionSearch.toLowerCase())
      return matches && (questionFilter === 'all' || (questionFilter === 'answered' ? answered : !answered))
    })
    .sort((left, right) => questionSort === 'answers' ? (right.answers?.length ?? 0) - (left.answers?.length ?? 0) : right.createdAt - left.createdAt), [questions, questionSearch, questionFilter, questionSort])

  const visibleGuides = useMemo(() => guides
    .filter(guide => `${guide.title} ${guide.text} ${guide.resources ?? ''}`.toLowerCase().includes(adviceSearch.toLowerCase()))
    .sort((left, right) => adviceSort === 'title' ? left.title.localeCompare(right.title) : right.createdAt - left.createdAt), [guides, adviceSearch, adviceSort])

  const toggleLike = (key: string) => setLiked(current => ({ ...current, [key]: !current[key] }))

  if (profile?.role !== 'teacher') return <Redirect href="/" />
  if (loading) return <Screen><View className="flex-1 items-center justify-center"><Text className="text-muted">Loading course...</Text></View></Screen>
  if (!course) return <Screen><Empty title="Course unavailable" body="This course could not be loaded." /></Screen>

  return <Screen edges={['top']}>
    <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}>
      <View className="mt-1"><PageHeader compact title="Course Details" onBack={() => goBack('/(teacher-tabs)/courses')} /></View>
      <TeacherCourseHero course={course} />
      <UnderlineTabs items={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' ? <Overview course={course} teachers={teachers} onQuestions={() => setTab('questions')} onReviews={() => setTab('reviews')} /> : null}

      {tab === 'reviews' ? <>
        <RatingSummary reviews={reviews} />
        <View className="mt-4 flex-row items-center gap-2">
          <View className="flex-1"><SearchBar pill value={reviewSearch} onChangeText={setReviewSearch} placeholder="Search reviews..." /></View>
          <SortMenu value={reviewSort} onChange={setReviewSort} options={[{ key: 'recent', label: 'Most recent' }, { key: 'highest', label: 'Highest rated' }]} />
        </View>
        {visibleReviews.length ? visibleReviews.map(review => <TeacherReviewCard key={review.id} review={review} course={course} liked={liked[review.id]} onLike={() => toggleLike(review.id)} />) : <Empty title="No reviews yet" body="Student reviews for this course will appear here." />}
      </> : null}

      {tab === 'questions' ? <>
        <View className="mt-4"><SearchBar pill value={questionSearch} onChangeText={setQuestionSearch} placeholder="Search questions..." /></View>
        <View className="mt-3 flex-row items-center justify-between gap-2">
          <SortMenu value={questionFilter} onChange={setQuestionFilter} options={[{ key: 'all', label: 'All Questions' }, { key: 'unanswered', label: 'Unanswered' }, { key: 'answered', label: 'Answered' }]} />
          <SortMenu value={questionSort} onChange={setQuestionSort} options={[{ key: 'recent', label: 'Most recent' }, { key: 'answers', label: 'Most answers' }]} />
        </View>
        {visibleQuestions.length ? visibleQuestions.map(question => <TeacherQuestionCard key={question.id} question={question} course={course} liked={liked[question.id]} onLike={() => toggleLike(question.id)} onAnswered={load} />) : <Empty title="No questions yet" body="Questions for this course will appear here." />}
      </> : null}

      {tab === 'advice' ? <>
        <Card className="mt-4 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
          <View className="flex-row gap-2">
            <Feather name="info" size={16} color={colors.brand} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-brand">This section shows advice and tips from senior students.</Text>
              <Text className="mt-1 text-xs leading-4 text-slate-600 dark:text-slate-300">You can view and use these insights to support your students.</Text>
            </View>
          </View>
        </Card>
        <View className="mt-4 flex-row items-center gap-2">
          <View className="flex-1"><SearchBar pill value={adviceSearch} onChangeText={setAdviceSearch} placeholder="Search advice..." /></View>
          <SortMenu value={adviceSort} onChange={setAdviceSort} options={[{ key: 'recent', label: 'Most recent' }, { key: 'title', label: 'Title' }]} />
        </View>
        {visibleGuides.length ? visibleGuides.map(guide => <TeacherAdviceCard key={guide.id} guide={guide} liked={liked[guide.id]} onLike={() => toggleLike(guide.id)} />) : <Empty title="No advice yet" body="Senior advice shared for this course will appear here." />}
      </> : null}
    </ScrollView>
    <SafeAreaView edges={['bottom']} className="bg-white dark:bg-slate-900">
      <AppBottomNav role="teacher" active="courses" />
    </SafeAreaView>
  </Screen>
}

function Overview({ course, teachers, onQuestions, onReviews }: { course: Course; teachers: Professor[]; onQuestions: () => void; onReviews: () => void }) {
  return <View>
    <Card className="mt-4">
      <Text className="mb-1 text-base font-extrabold text-ink dark:text-white">Course Information</Text>
      <InfoRow icon="book" label="Course Code" value={course.code} />
      <InfoRow icon="file-text" label="Course Title" value={course.title} />
      <InfoRow icon="home" label="Department" value={course.department} />
      <InfoRow icon="layers" label="Level / Term" value={academicLabel(course.level, course.term).replace(', ', ' / ')} />
      <InfoRow icon="box" label="Course Type" value={course.courseType ?? 'Theory'} />
      <InfoRow icon="clock" label="Credits" value={String(course.credits)} />
    </Card>
    <Card className="mt-4">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-ink dark:text-white">Course Teachers</Text>
        <Text className="text-xs font-bold text-brand">See All</Text>
      </View>
      {teachers.length ? teachers.map(teacher => <TeacherRow key={teacher.id} teacher={teacher} />) : <Text className="py-3 text-sm text-muted">Teacher assignment pending.</Text>}
    </Card>
    <Card className="mt-4">
      <Text className="mb-3 text-base font-extrabold text-ink dark:text-white">Tags</Text>
      <View className="flex-row flex-wrap gap-2">
        {(course.tags.length ? course.tags : [course.courseType ?? 'Course']).map(tag => <Text key={tag} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink dark:border-slate-700 dark:text-white">{tag}</Text>)}
      </View>
    </Card>
    <Card className="mt-4">
      <Text className="mb-3 text-base font-extrabold text-ink dark:text-white">Quick Actions</Text>
      <View className="flex-row gap-3">
        <Pressable onPress={onQuestions} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3.5"><Feather name="message-circle" size={16} color="#FFFFFF" /><Text className="font-bold text-white">View Q&A</Text></Pressable>
        <Pressable onPress={onReviews} className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-line bg-white py-3.5 dark:border-slate-700 dark:bg-slate-900"><Feather name="star" size={16} color={colors.brand} /><Text className="font-bold text-brand">View Reviews</Text></Pressable>
      </View>
    </Card>
  </View>
}

function isTab(value?: string): value is Tab {
  return value === 'overview' || value === 'reviews' || value === 'questions' || value === 'advice'
}
