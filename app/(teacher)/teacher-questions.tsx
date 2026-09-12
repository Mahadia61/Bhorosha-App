import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { Redirect } from 'expo-router'
import { Empty, FilterChips, Screen, SearchBar } from '@/components/ui'
import { courseService } from '@/features/courses'
import { questionService } from '@/features/questions'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion } from '@/types'
import { TeacherHeader } from '@/components/teacher/TeacherHeader'
import { SortMenu, TeacherQuestionCard, teacherAnswered } from '@/components/teacher/teacher-ui'

type StatusFilter = 'all' | 'unanswered' | 'answered'
type SortKey = 'recent' | 'answers'

export default function TeacherQuestions(_props: { inTab?: boolean } = {}) {
  const { profile } = useApp()
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!profile) return
    const [nextQuestions, nextCourses] = await Promise.all([questionService.teacherQuestions(profile.id), courseService.courses()])
    setQuestions(nextQuestions)
    setCourses(nextCourses)
  }, [profile])

  useEffect(() => { void load() }, [load])

  const visibleQuestions = useMemo(() => {
    const filtered = questions.filter(question => {
      const course = courses.find(item => item.id === question.courseId)
      const haystack = `${question.text} ${question.category} ${course?.code ?? ''} ${course?.title ?? ''}`.toLowerCase()
      const answered = teacherAnswered(question)
      return haystack.includes(search.toLowerCase()) && (filter === 'all' || (filter === 'answered' ? answered : !answered))
    })
    return filtered.sort((left, right) => sort === 'answers' ? (right.answers?.length ?? 0) - (left.answers?.length ?? 0) : right.createdAt - left.createdAt)
  }, [questions, courses, search, filter, sort])

  if (profile?.role !== 'teacher') return <Redirect href="/" />
  return <Screen>
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
      <TeacherHeader title="Q&A" subtitle="Answer questions from your assigned courses." />
      <View className="mt-5"><SearchBar pill value={search} onChangeText={setSearch} placeholder="Search questions..." /></View>
      <View className="mt-4 flex-row items-center justify-between gap-2">
        <View className="flex-1"><FilterChips items={[{ key: 'all', label: 'All Questions' }, { key: 'unanswered', label: 'Unanswered' }, { key: 'answered', label: 'Answered' }]} value={filter} onChange={setFilter} /></View>
        <SortMenu value={sort} onChange={setSort} options={[{ key: 'recent', label: 'Most recent' }, { key: 'answers', label: 'Most answers' }]} />
      </View>
      {visibleQuestions.length ? visibleQuestions.map(question => {
        const course = courses.find(item => item.id === question.courseId)
        return <TeacherQuestionCard key={question.id} question={question} course={course} liked={liked[question.id]} onLike={() => setLiked(current => ({ ...current, [question.id]: !current[question.id] }))} onAnswered={load} />
      }) : <Empty title="No course questions" body="Questions from students in your assigned courses will appear here." />}
    </ScrollView>
  </Screen>
}
