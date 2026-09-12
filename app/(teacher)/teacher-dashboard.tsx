import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Card, Empty, Screen, SectionHeader } from '@/components/ui'
import { TeacherHeader } from '@/components/teacher/TeacherHeader'
import { ActivityRow, TeacherCourseCard, TeacherStatCard, TeacherWelcomeBanner, teacherAnswered, type TeacherActivity } from '@/components/teacher/teacher-ui'
import { teachesCourse } from '@/features/courses'
import { courseService } from '@/features/courses'
import { questionService } from '@/features/questions'
import { reviewService } from '@/features/reviews'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, ProfessorReview, Review } from '@/types'
import type { Href } from 'expo-router'

export default function TeacherDashboard() {
  const { profile } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [teacherReviews, setTeacherReviews] = useState<ProfessorReview[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    setRefreshing(true)
    setError('')
    try {
      const assigned = (await courseService.courses()).filter(course => teachesCourse(course, profile))
      const [nextQuestions, reviewGroups, personalReviews] = await Promise.all([
        questionService.teacherQuestions(profile.id),
        Promise.all(assigned.map(course => reviewService.reviews(course.id))),
        reviewService.teachingProfileReviews(profile),
      ])
      setCourses(assigned)
      setQuestions(nextQuestions)
      setReviews(reviewGroups.flat())
      setTeacherReviews(personalReviews)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your dashboard.')
    } finally {
      setRefreshing(false)
    }
  }, [profile])

  useEffect(() => { void load() }, [load])

  const pending = useMemo(() => questions.filter(question => !teacherAnswered(question)).length, [questions])
  const activity = useMemo(() => {
    const courseById = new Map(courses.map(course => [course.id, course]))
    const items: TeacherActivity[] = []
    for (const question of questions) {
      const course = courseById.get(question.courseId)
      const label = course ? `${course.code} – ${course.title}` : 'Assigned course'
      items.push({ id: `question-${question.id}`, title: 'New question received', subtitle: label, createdAt: question.createdAt, tone: 'question', href: `/teacher-course/${question.courseId}?tab=questions` as Href })
      for (const answer of question.answers ?? []) {
        if (answer.authorRole !== 'teacher') continue
        items.push({ id: `answer-${answer.id}`, title: 'You replied to a question', subtitle: label, createdAt: answer.createdAt, tone: 'answer', href: `/teacher-course/${question.courseId}?tab=questions` as Href })
      }
    }
    for (const review of reviews) {
      const course = courseById.get(review.courseId)
      items.push({ id: `review-${review.id}`, title: 'New review submitted', subtitle: course ? `${course.code} – ${course.title}` : 'Course review', createdAt: review.createdAt, tone: 'review', href: `/teacher-course/${review.courseId}?tab=reviews` as Href })
    }
    for (const review of teacherReviews) {
      items.push({ id: `teacher-review-${review.id}`, title: 'New teacher review', subtitle: review.anonymous ? 'Anonymous student left a review' : `${review.displayName ?? 'Student'} left a review`, createdAt: review.createdAt, tone: 'teacherReview', href: '/teacher-courses' as Href })
    }
    return items.sort((left, right) => right.createdAt - left.createdAt).slice(0, 6)
  }, [courses, questions, reviews, teacherReviews])

  if (profile?.role !== 'teacher') return <Redirect href="/" />

  return <Screen>
    <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
      <View className="mt-3">
        <TeacherHeader eyebrow="Welcome back," title={profile.name} subtitle={profile.designation ? `${profile.designation} · Department of ${profile.department}` : `Department of ${profile.department}`} />
      </View>
      <TeacherWelcomeBanner />
      <View className="mt-5 flex-row gap-3">
        <TeacherStatCard icon="book" value={courses.length} label="Assigned Courses" tone="blue" />
        <TeacherStatCard icon="message-circle" value={pending} label="Pending Questions" tone="orange" />
        <TeacherStatCard icon="star" value={reviews.length + teacherReviews.length} label="Total Reviews" tone="green" />
      </View>
      <SectionHeader title="My Courses" action="See All" onPress={() => router.push('/(teacher-tabs)/courses')} />
      {courses.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 12 }}>
        {courses.map(course => <TeacherCourseCard key={course.id} course={course} compact />)}
      </ScrollView> : <Empty title={error ? 'Unable to load courses' : 'No assigned courses'} body={error || 'Courses assigned to you by the admin will appear here.'} />}
      <SectionHeader title="Recent Activity" action="View All" onPress={() => router.push('/(teacher-tabs)/questions')} />
      <Card className="mt-3 p-2">
        {activity.length ? activity.map(item => <ActivityRow key={item.id} item={item} />) : <Text className="px-3 py-4 text-sm text-muted">Questions, answers, and reviews from your courses will appear here.</Text>}
      </Card>
    </ScrollView>
  </Screen>
}
