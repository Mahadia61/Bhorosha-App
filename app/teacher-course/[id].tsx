import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/academic'
import type { Course, CourseQuestion, Review } from '@/lib/types'

type Tab = 'info' | 'reviews' | 'questions' | 'statistics'
type ReviewFilter = 'all' | 'positive' | 'critical'

export default function TeacherCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useApp()
  const [course, setCourse] = useState<Course | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [tab, setTab] = useState<Tab>('info')
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    void Promise.all([services.course(id), services.reviews(id), services.courseQuestions(id)])
      .then(([nextCourse, nextReviews, nextQuestions]) => {
        if (!nextCourse || !nextCourse.teacherIds.includes(profile.id)) throw new Error('This course is not assigned to you.')
        setCourse(nextCourse); setReviews(nextReviews); setQuestions(nextQuestions)
      })
      .catch(reason => Alert.alert('Could not load course', reason instanceof Error ? reason.message : 'Please try again.'))
      .finally(() => setLoading(false))
  }, [id, profile?.id])

  const average = reviews.length ? reviews.reduce((sum, review) => sum + reviewAverage(review), 0) / reviews.length : 0
  const answered = questions.filter(question => (question.answers ?? []).some(answer => answer.authorRole === 'teacher')).length
  const visibleReviews = useMemo(() => reviews.filter(review => {
    const rating = reviewAverage(review)
    return reviewFilter === 'all' || (reviewFilter === 'positive' ? rating >= 4 : rating < 4)
  }), [reviews, reviewFilter])

  if (profile?.role !== 'teacher') return <Redirect href="/" />
  if (loading) return <SafeAreaView className="flex-1 items-center justify-center bg-surface"><Text className="text-muted">Loading course...</Text></SafeAreaView>
  if (!course) return <SafeAreaView className="flex-1 items-center justify-center bg-surface"><Empty title="Course unavailable" body="This course could not be loaded." /></SafeAreaView>

  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Card className="mt-2">
      <Text className="text-xs font-bold text-brand">{course.code}</Text>
      <Text className="mt-1 text-2xl font-bold text-ink dark:text-white">{course.title}</Text>
      <Text className="mt-2 text-sm text-muted">{academicLabel(course.level, course.term)} · {course.courseType ?? 'Theory'} · {course.credits} credits</Text>
      <Text className="mt-2 text-sm text-muted">Teachers: {course.teacherNames.length ? course.teacherNames.join(', ') : 'Not assigned'}</Text>
      <View className="mt-5 flex-row gap-2">
        {([['info', 'Info'], ['reviews', 'Reviews'], ['questions', 'Q&A'], ['statistics', 'Stats']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setTab(value)} className={`min-w-0 flex-1 items-center justify-center rounded-lg border px-1 py-2.5 ${tab === value ? 'border-brand bg-brand' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'}`}><Text numberOfLines={1} className={`text-center text-[11px] font-semibold ${tab === value ? 'text-white' : 'text-muted'}`}>{label}</Text></Pressable>)}
      </View>
    </Card>

    {tab === 'info' ? <InfoTab course={course} /> : null}
    {tab === 'reviews' ? <ReviewsTab reviews={visibleReviews} filter={reviewFilter} onFilterChange={setReviewFilter} /> : null}
    {tab === 'questions' ? <QuestionsTab courseCode={course.code} questions={questions} /> : null}
    {tab === 'statistics' ? <StatisticsTab average={average} questions={questions.length} answered={answered} reviews={reviews.length} /> : null}
  </ScrollView></SafeAreaView>
}

function InfoTab({ course }: { course: Course }) {
  return <><SectionTitle title="Course Information" /><Card className="mt-3"><InfoRow label="Course description" value="No description provided." /><InfoRow label="Course category" value={course.courseType ?? 'Not specified'} /><InfoRow label="Department" value={course.department} /><InfoRow label="Credit" value={course.credits} /><InfoRow label="Level" value={course.level ?? 'Not specified'} /><InfoRow label="Term" value={course.term ?? 'Not specified'} /><InfoRow label="Status" value={course.status ?? 'active'} /><InfoRow label="Tags" value={course.tags.length ? course.tags.join(', ') : 'No tags'} /></Card></>
}

function ReviewsTab({ reviews, filter, onFilterChange }: { reviews: Review[]; filter: ReviewFilter; onFilterChange: (filter: ReviewFilter) => void }) {
  return <><SectionTitle title="Student Reviews" /><View className="mt-3 flex-row gap-2">{(['all', 'positive', 'critical'] as const).map(option => <Pressable key={option} onPress={() => onFilterChange(option)} className={`rounded-full px-3 py-2 ${filter === option ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold capitalize ${filter === option ? 'text-white' : 'text-muted'}`}>{option}</Text></Pressable>)}</View>{reviews.length ? reviews.map(review => <Card key={review.id} className="mt-3"><Stars value={reviewAverage(review)} /><Text className="mt-3 leading-5 text-ink dark:text-white">{review.text}</Text><Text className="mt-2 text-xs text-muted">{review.anonymous ? 'Anonymous student' : review.displayName ?? 'Student'}</Text>{review.responses?.map(response => <View key={response.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">TEACHER RESPONSE</Text><Text className="mt-1 text-sm text-ink dark:text-white">{response.text}</Text></View>)}</Card>) : <Empty title="No reviews in this filter" body="Reviews for this course will appear here." />}</>
}

function QuestionsTab({ courseCode, questions }: { courseCode: string; questions: CourseQuestion[] }) {
  return <><SectionTitle title={`${courseCode} Q&A`} />{questions.length ? questions.map(question => <Card key={question.id} className="mt-3"><Text className="text-xs font-bold text-brand">{question.category}</Text><Text className="mt-2 leading-5 text-ink dark:text-white">{question.text}</Text>{question.answers?.map(answer => <View key={answer.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{answer.authorRole === 'teacher' ? 'TEACHER ANSWER' : 'STUDENT RESPONSE'}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{answer.text}</Text></View>)}{!(question.answers ?? []).some(answer => answer.authorRole === 'teacher') ? <Text className="mt-3 text-xs font-semibold text-muted">Awaiting teacher answer</Text> : null}</Card>) : <Empty title="No questions yet" body="Questions for this course will appear here." />}</>
}

function StatisticsTab({ average, questions, answered, reviews }: { average: number; questions: number; answered: number; reviews: number }) {
  return <><SectionTitle title="Course Statistics" /><Card className="mt-3"><InfoRow label="Students enrolled" value="Not available" /><InfoRow label="Average rating" value={average ? `${average.toFixed(1)} / 5` : 'No data'} /><InfoRow label="Total reviews" value={reviews} /><InfoRow label="Total questions" value={questions} /><InfoRow label="Answered questions" value={answered} /><InfoRow label="Pending questions" value={questions - answered} /></Card></>
}

function reviewAverage(review: Review) { const ratings = Object.values(review.ratings); return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0 }
function SectionTitle({ title }: { title: string }) { return <Text className="mt-7 text-xl font-bold text-ink dark:text-white">{title}</Text> }
function InfoRow({ label, value }: { label: string; value: string | number }) { return <View className="border-b border-slate-100 py-3 dark:border-slate-800"><Text className="text-xs font-semibold uppercase text-muted">{label}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{value}</Text></View> }
