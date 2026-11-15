import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty, Stars } from '@/components/ui/ui'
import { courseService } from '@/features/courses'
import { questionService } from '@/features/questions'
import { reviewService } from '@/features/reviews'
import { userService } from '@/features/users'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, Professor, ProfessorReview, QuestionAnswer, Profile } from '@/types'
import { ReportButton } from '@/components/moderation/ReportButton'
import { CommunityVoteButtons } from '@/components/feedback/CommunityVoteButtons'
import type { ReviewSummary } from '@/lib/services/ai'
import { summarizeReviews } from '@/lib/utils/ai-summary'

type Tab = 'overview' | 'reviews' | 'questions'
type QuestionFilter = 'all' | 'course' | 'academic' | 'other'

export default function ProfessorDetail() {
  const { id, tab: requestedTab } = useLocalSearchParams<{ id: string; tab?: string }>()
  const { isDark, profile } = useApp()
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : 'overview')
  const [teacher, setTeacher] = useState<Professor | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<ProfessorReview[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [search, setSearch] = useState('')
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('all')
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  const [summarizing, setSummarizing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [people, allCourses] = await Promise.all([userService.professors(), courseService.courses()])
      const nextTeacher = people.find(person => person.id === id)
      if (!nextTeacher) throw new Error('This teacher profile is no longer available.')
      const nextCourses = allCourses.filter(course => course.teacherIds.includes(id) || course.teacherNames.includes(nextTeacher.name))
      const [nextReviews, questionLists] = await Promise.all([reviewService.professorReviews(id), Promise.all(nextCourses.map(course => questionService.courseQuestions(course.id)))])
      setTeacher(nextTeacher); setCourses(nextCourses); setReviews(nextReviews); setQuestions(questionLists.flat()); setError('')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load this teacher.') }
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (isTab(requestedTab)) setTab(requestedTab) }, [requestedTab])

  const visibleReviews = useMemo(() => reviews.filter(review => `${review.text} ${review.displayName ?? ''}`.toLowerCase().includes(search.toLowerCase())), [reviews, search])
  const visibleQuestions = useMemo(() => questions.filter(question => {
    const categoryMatch = questionFilter === 'all' || (questionFilter === 'course' && question.category.toLowerCase().includes('course')) || (questionFilter === 'academic' && question.category === 'Academic') || (questionFilter === 'other' && question.category === 'Other')
    return categoryMatch && question.text.toLowerCase().includes(search.toLowerCase())
  }), [questions, questionFilter, search])
  const selectTab = (next: Tab) => { setTab(next); setSearch(''); router.setParams({ tab: next }) }
  const openForm = (form: 'review' | 'question') => router.push(`/professor/${form}?id=${encodeURIComponent(id)}` as never)
  const generateSummary = async () => {
    setSummarizing(true)
    try { setSummary(await summarizeReviews({ type: 'teacher', id, label: teacher?.name ?? 'this teacher' }, reviews)) }
    catch (reason) { Alert.alert('Could not generate summary', reason instanceof Error ? reason.message : 'Please try again.') }
    finally { setSummarizing(false) }
  }

  if (error) return <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 items-center justify-center bg-[#F8FAFD] px-6 dark:bg-slate-950"><Text className="text-center text-sm text-muted">{error}</Text></SafeAreaView>
  if (!teacher) return <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 items-center justify-center bg-[#F8FAFD] dark:bg-slate-950"><Text className="text-sm text-muted">Loading teacher…</Text></SafeAreaView>

  return <SafeAreaView edges={['left', 'right', 'bottom']} className="flex-1 bg-[#F8FAFD] dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View className="pt-2"><Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center"><Feather name="arrow-left" size={21} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable></View>
      <View className="mt-5 flex-row items-center gap-3"><View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-2xl font-extrabold text-brand">{initials(teacher.name)}</Text></View><View className="flex-1"><Text className="text-sm font-extrabold text-[#172038] dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-[#52627A] dark:text-slate-300">{teacher.designation || 'Faculty member'}</Text><Text className="text-xs text-[#52627A] dark:text-slate-300">Department of {teacher.department}</Text>{teacher.email ? <View className="mt-1 flex-row items-center gap-1"><Feather name="mail" size={11} color="#64718B" /><Text className="text-[10px] text-[#64718B]">{teacher.email}</Text></View> : null}</View></View>
      <View className="mt-5 flex-row border-b border-slate-200 dark:border-slate-800">{(['overview', 'reviews', 'questions'] as const).map(item => <Pressable key={item} onPress={() => selectTab(item)} className="flex-1 items-center pb-3"><Text className={`text-xs font-bold ${tab === item ? 'text-brand' : 'text-[#64718B] dark:text-slate-400'}`}>{item === 'questions' ? 'Q&A' : item[0].toUpperCase() + item.slice(1)}</Text>{tab === item ? <View className="absolute bottom-0 h-0.5 w-full bg-brand" /> : null}</Pressable>)}</View>
      {tab === 'overview' ? <Overview courses={courses} teacher={teacher} summary={summary} summarizing={summarizing} onSummary={() => { void generateSummary() }} onAsk={() => openForm('question')} onReview={() => openForm('review')} /> : null}
      {tab === 'reviews' ? <Reviews reviews={visibleReviews} search={search} onSearch={setSearch} onWrite={() => openForm('review')} /> : null}
      {tab === 'questions' ? <Questions questions={visibleQuestions} filter={questionFilter} onFilter={setQuestionFilter} search={search} onSearch={setSearch} onAsk={() => openForm('question')} profile={profile} /> : null}
    </ScrollView>
  </SafeAreaView>
}

function Overview({ courses, teacher, summary, summarizing, onSummary, onAsk, onReview }: { courses: Course[]; teacher: Professor; summary: ReviewSummary | null; summarizing: boolean; onSummary: () => void; onAsk: () => void; onReview: () => void }) {
  return <View>
    <Text className="mt-5 text-sm font-extrabold text-[#172038] dark:text-white">Courses Taught</Text>
    <Card className="mt-3 p-2">{courses.length ? courses.map(course => <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}`)} className="flex-row items-center border-b border-slate-100 px-2 py-3 last:border-b-0 dark:border-slate-800"><View className="h-11 w-11 items-center justify-center rounded-lg bg-blue-100 dark:bg-slate-800"><Text className="text-center text-[10px] font-extrabold leading-3 text-brand">{course.code.split(' ').join('\n')}</Text></View><View className="ml-3 flex-1"><Text className="text-xs font-bold text-[#172038] dark:text-white">{course.title}</Text><Text className="mt-1 text-[10px] text-muted">Level {course.level ?? '—'} · Term {course.term ?? '—'}</Text></View><Feather name="chevron-right" size={16} color="#172038" /></Pressable>) : <Empty title="No courses assigned" body="Assigned courses will appear here." />}</Card>
    <View className="mt-5 flex-row items-center justify-between">
      <Text className="text-sm font-extrabold text-[#172038] dark:text-white">AI Review Summary</Text>
      <Pressable accessibilityRole="button" onPress={onSummary} disabled={summarizing} className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-slate-800">
        <Text className="text-xs font-bold text-brand">{summarizing ? 'Preparing…' : 'Generate'}</Text>
      </Pressable>
    </View>
    <Card className="mt-3">
      {summary ? <>
        <Text className="text-sm leading-5 text-[#52627A] dark:text-slate-300">{summary.summary}</Text>
        <Text className="mt-2 text-[10px] font-bold uppercase text-[#52627A] dark:text-slate-300">Sentiment: {summary.sentiment}</Text>
        {summary.positivePoints.length ? <Text className="mt-2 text-xs text-[#52627A] dark:text-slate-300">Positive: {summary.positivePoints.join(' • ')}</Text> : null}
        {summary.negativePoints.length ? <Text className="mt-1 text-xs text-[#52627A] dark:text-slate-300">Needs attention: {summary.negativePoints.join(' • ')}</Text> : null}
      </> : <Text className="text-xs leading-5 text-muted">Generate an AI summary of student feedback for this teacher.</Text>}
    </Card>
    <Text className="mt-5 text-sm font-extrabold text-[#172038] dark:text-white">Contact</Text>
    <Card className="mt-3 p-3"><Contact icon="mail" label={teacher.email ?? 'Not provided'} /><Contact icon="users" label={`Department\n${teacher.department}`} /><Contact icon="map-pin" label="CUET, Chattogram" /></Card>
    <View className="mt-5 flex-row gap-2"><Button className="flex-1" variant="outline" onPress={onAsk}>Ask a Question</Button><Button className="flex-1" onPress={onReview}>Write a Review</Button></View>
  </View>
}

function Reviews({ reviews, search, onSearch, onWrite }: { reviews: ProfessorReview[]; search: string; onSearch: (value: string) => void; onWrite: () => void }) {
  return <View>
    <View className="mt-4 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
      <Feather name="search" size={16} color="#64718B" />
      <TextInput value={search} onChangeText={onSearch} placeholder="Search reviews…" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white" />
    </View>
    {reviews.length ? reviews.map(review => <ReviewCard key={review.id} review={review} />) : <Empty title="No reviews yet" body="Student feedback will appear here." />}
    <Button className="mt-4" onPress={onWrite}>Write a Review</Button>
  </View>
}

function ReviewCard({ review }: { review: ProfessorReview }) {
  return <Card className="mt-3 p-4">
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700"><Text className="font-bold text-slate-600 dark:text-slate-200">{review.anonymous ? 'A' : initials(review.displayName ?? 'Student')}</Text></View>
        <View><Text className="text-sm font-bold text-[#172038] dark:text-white">{review.anonymous ? 'Anonymous' : review.displayName ?? 'Student'}</Text><Text className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</Text></View>
      </View>
      <Stars value={review.rating} />
    </View>
    <Text className="mt-3 text-sm leading-5 text-[#52627A] dark:text-slate-300">{review.text}</Text>
    <View className="mt-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-4">
        <CommunityVoteButtons contentType="professorReview" contentId={review.id} />
      </View>
      <ReportButton contentType="professorReview" contentId={review.id} />
    </View>
  </Card>
}

function Questions({ questions, filter, onFilter, search, onSearch, onAsk, profile }: { questions: CourseQuestion[]; filter: QuestionFilter; onFilter: (value: QuestionFilter) => void; search: string; onSearch: (value: string) => void; onAsk: () => void; profile: Profile | null }) {
  const filters = [{ key: 'all', label: 'All' }, { key: 'course', label: 'Course Related' }, { key: 'academic', label: 'Academic' }, { key: 'other', label: 'Other' }] as const
  return <View>
    <View className="mt-4 flex-row flex-wrap gap-2">{filters.map(item => <Pressable key={item.key} onPress={() => onFilter(item.key)} className={`rounded-lg px-3 py-2 ${filter === item.key ? 'bg-brand' : 'bg-white dark:bg-slate-900'}`}><Text className={`text-[10px] font-semibold ${filter === item.key ? 'text-white' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View>
    <View className="mt-3 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={16} color="#64718B" /><TextInput value={search} onChangeText={onSearch} placeholder="Search questions…" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white" /></View>
    {questions.length ? questions.map(question => <QuestionCard key={question.id} question={question} profile={profile} />) : <Empty title="No questions yet" body="Questions about this teacher's courses will appear here." />}
    <Button className="mt-4" onPress={onAsk}>Ask a Question</Button>
  </View>
}

function QuestionCard({ question, profile }: { question: CourseQuestion; profile: Profile | null }) {
  const answers = question.answers ?? []
  return <Card className="mt-3 p-4">
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700"><Text className="font-bold text-slate-600 dark:text-slate-200">{question.anonymous ? 'A' : (question.displayName ?? 'S').charAt(0)}</Text></View>
        <View className="flex-1"><Text className="text-sm font-bold text-[#172038] dark:text-white">{question.anonymous ? 'Anonymous' : question.displayName ?? 'Student'}</Text><Text className="text-xs text-muted">{question.category} · {new Date(question.createdAt).toLocaleDateString()}</Text></View>
      </View>
      {profile?.role !== 'admin' ? <ReportButton contentType="courseQuestion" contentId={question.id} /> : null}
    </View>
    <Text className="mt-2 text-sm leading-5 text-[#52627A] dark:text-slate-300">{question.text}</Text>
    <View className="mt-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-4">
        <CommunityVoteButtons contentType="courseQuestion" contentId={question.id} />
      </View>
    </View>
    {answers.filter(answer => !answer.parentAnswerId).map(answer => <AnswerThread key={answer.id} answer={answer} answers={answers} questionId={question.id} profile={profile} />)}
  </Card>
}

function AnswerThread({ answer, answers, questionId, profile }: { answer: QuestionAnswer; answers: QuestionAnswer[]; questionId: string; profile: Profile | null }) {
  const children = answers.filter(item => item.parentAnswerId === answer.id)
  return <View className="ml-3 mt-3 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
    <View className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <View className="flex-row items-center justify-between"><Text className="flex-1 text-xs font-bold text-[#172038] dark:text-white">{answer.authorRole === 'teacher' ? `${answer.authorName} · Teacher` : 'Student'}</Text>{profile?.role !== 'admin' ? <ReportButton contentType="answer" contentId={answer.id} questionId={questionId} /> : null}</View>
      <Text className="mt-1 text-sm leading-5 text-[#52627A] dark:text-slate-300">{answer.text}</Text>
      <View className="mt-2 flex-row items-center gap-4">
        <CommunityVoteButtons contentType="answer" contentId={answer.id} questionId={questionId} />
      </View>
    </View>
    {children.map(child => <AnswerThread key={child.id} answer={child} answers={answers} questionId={questionId} profile={profile} />)}
  </View>
}

function Contact({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) { return <View className="flex-row items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Feather name={icon} size={17} color="#52627A" /><Text className="flex-1 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">{label}</Text></View> }
function initials(name: string) { const parts = name.trim().split(/\s+/); return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() }
function isTab(value: string | undefined): value is Tab { return value === 'overview' || value === 'reviews' || value === 'questions' }
