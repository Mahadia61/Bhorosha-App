import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty } from '@/components/ui/ui'
import { courseService } from '@/features/courses'
import { questionService } from '@/features/questions'
import { reviewService } from '@/features/reviews'
import { userService } from '@/features/users'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, Professor, ProfessorReview } from '@/types'
import { ReportButton } from '@/components/moderation/ReportButton'

type Tab = 'overview' | 'reviews' | 'questions'
type QuestionFilter = 'all' | 'course' | 'academic' | 'other'

export default function ProfessorDetail() {
  const { id, tab: requestedTab } = useLocalSearchParams<{ id: string; tab?: string }>()
  const { profile, isDark } = useApp()
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : 'overview')
  const [teacher, setTeacher] = useState<Professor | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<ProfessorReview[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [search, setSearch] = useState('')
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>('all')
  const [error, setError] = useState('')

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

  if (error) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F8FAFD] px-6 dark:bg-slate-950"><Text className="text-center text-sm text-muted">{error}</Text></SafeAreaView>
  if (!teacher) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F8FAFD] dark:bg-slate-950"><Text className="text-sm text-muted">Loading teacher…</Text></SafeAreaView>

  return <SafeAreaView className="flex-1 bg-[#F8FAFD] dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 104 }} showsVerticalScrollIndicator={false}>
      <View className="flex-row items-center justify-between pt-2"><Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center"><Feather name="arrow-left" size={21} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable><View className="flex-row items-center gap-3"><Pressable onPress={() => router.push('/student-notifications' as never)} className="relative"><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#172038'} /><View className="absolute -right-2 -top-2 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1"><Text className="text-[9px] font-bold text-white">3</Text></View></Pressable><Pressable onPress={() => router.push('/(tabs)/profile' as never)} className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable></View></View>
      <View className="mt-5 flex-row items-center gap-3"><View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-2xl font-extrabold text-brand">{initials(teacher.name)}</Text></View><View className="flex-1"><Text className="text-sm font-extrabold text-[#172038] dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-[#52627A] dark:text-slate-300">{teacher.designation || 'Faculty member'}</Text><Text className="text-xs text-[#52627A] dark:text-slate-300">Department of {teacher.department}</Text>{teacher.email ? <View className="mt-1 flex-row items-center gap-1"><Feather name="mail" size={11} color="#64718B" /><Text className="text-[10px] text-[#64718B]">{teacher.email}</Text></View> : null}</View></View>
      <View className="mt-5 flex-row border-b border-slate-200 dark:border-slate-800">{(['overview', 'reviews', 'questions'] as const).map(item => <Pressable key={item} onPress={() => selectTab(item)} className="flex-1 items-center pb-3"><Text className={`text-xs font-bold ${tab === item ? 'text-brand' : 'text-[#64718B] dark:text-slate-400'}`}>{item === 'questions' ? 'Q&A' : item[0].toUpperCase() + item.slice(1)}</Text>{tab === item ? <View className="absolute bottom-0 h-0.5 w-full bg-brand" /> : null}</Pressable>)}</View>
      {tab === 'overview' ? <Overview courses={courses} teacher={teacher} onAsk={() => openForm('question')} onReview={() => openForm('review')} /> : null}
      {tab === 'reviews' ? <Reviews reviews={visibleReviews} search={search} onSearch={setSearch} onWrite={() => openForm('review')} /> : null}
      {tab === 'questions' ? <Questions questions={visibleQuestions} filter={questionFilter} onFilter={setQuestionFilter} search={search} onSearch={setSearch} onAsk={() => openForm('question')} /> : null}
    </ScrollView>
    <TeacherBottomNav />
  </SafeAreaView>
}

function Overview({ courses, teacher, onAsk, onReview }: { courses: Course[]; teacher: Professor; onAsk: () => void; onReview: () => void }) {
  return <View><View className="mt-5 flex-row items-center justify-between"><Text className="text-sm font-extrabold text-[#172038] dark:text-white">Courses Taught</Text><Text className="text-[10px] font-bold text-brand">See all</Text></View><Card className="mt-3 p-2">{courses.length ? courses.map(course => <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}`)} className="flex-row items-center border-b border-slate-100 px-2 py-3 last:border-b-0 dark:border-slate-800"><View className="h-11 w-11 items-center justify-center rounded-lg bg-blue-100 dark:bg-slate-800"><Text className="text-center text-[10px] font-extrabold leading-3 text-brand">{course.code.split(' ').join('\n')}</Text></View><View className="ml-3 flex-1"><Text className="text-xs font-bold text-[#172038] dark:text-white">{course.title}</Text><Text className="mt-1 text-[10px] text-muted">Level {course.level ?? '—'} · Term {course.term ?? '—'}</Text></View><Feather name="chevron-right" size={16} color="#172038" /></Pressable>) : <Empty title="No courses assigned" body="Assigned courses will appear here." />}</Card><Text className="mt-5 text-sm font-extrabold text-[#172038] dark:text-white">Contact</Text><Card className="mt-3 p-3"><Contact icon="mail" label={teacher.email ?? 'Not provided'} /><Contact icon="users" label={`Department\n${teacher.department}`} /><Contact icon="map-pin" label="CUET, Chattogram" /></Card><View className="mt-5 flex-row gap-2"><Button className="flex-1" variant="outline" onPress={onAsk}>Ask a Question</Button><Button className="flex-1" onPress={onReview}>Write a Review</Button></View></View>
}

function Reviews({ reviews, search, onSearch, onWrite }: { reviews: ProfessorReview[]; search: string; onSearch: (value: string) => void; onWrite: () => void }) {
  return <View><View className="mt-4 flex-row items-center gap-2"><View className="flex-1 flex-row items-center rounded-xl bg-white px-3 dark:bg-slate-900"><Feather name="search" size={15} color="#64718B" /><TextInput value={search} onChangeText={onSearch} placeholder="Search reviews..." placeholderTextColor="#94A3B8" className="flex-1 px-2 py-2 text-xs text-[#172038] dark:text-white" /></View><View className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><Text className="text-[10px] text-muted">Most recent⌄</Text></View></View>{reviews.length ? reviews.map(review => <ReviewCard key={review.id} review={review} />) : <Empty title="No reviews yet" body="Student feedback will appear here." />}<Button className="mt-4" onPress={onWrite}>Write a Review</Button></View>
}

function ReviewCard({ review }: { review: ProfessorReview }) {
  return <Card className="mt-3 p-3"><View className="flex-row items-center gap-3"><View className={`h-9 w-9 items-center justify-center rounded-full ${review.anonymous ? 'bg-slate-200' : 'bg-rose-100'}`}><Text className="text-xs font-bold text-slate-600">{review.anonymous ? 'A' : initials(review.displayName ?? 'Student')}</Text></View><View className="flex-1"><Text className="text-xs font-bold text-[#172038] dark:text-white">{review.anonymous ? 'Anonymous Student' : review.displayName ?? 'Named Student'}</Text><Text className="text-[10px] text-muted">{new Date(review.createdAt).toLocaleDateString()}</Text></View><View className="flex-row">{[1, 2, 3, 4, 5].map(item => <Feather key={item} name="star" size={12} color={item <= Math.round(review.rating) ? '#F59E0B' : '#DCE1E8'} />)}</View></View><Text className="mt-3 text-xs leading-5 text-[#52627A] dark:text-slate-300">{review.text}</Text><View className="mt-3 flex-row flex-wrap gap-2">{(review.tags?.length ? review.tags : ['Clear explanation', 'Supportive', 'Engaging']).slice(0, 3).map(tag => <Text key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[9px] text-muted dark:bg-slate-800">{tag}</Text>)}</View>  <View className="mt-3 flex-row justify-end"><ReportButton contentType="professorReview" contentId={review.id} /></View></Card>
}

function Questions({ questions, filter, onFilter, search, onSearch, onAsk }: { questions: CourseQuestion[]; filter: QuestionFilter; onFilter: (value: QuestionFilter) => void; search: string; onSearch: (value: string) => void; onAsk: () => void }) {
  const filters = [{ key: 'all', label: 'All' }, { key: 'course', label: 'Course Related' }, { key: 'academic', label: 'Academic' }, { key: 'other', label: 'Other' }] as const
  return <View><View className="mt-4 flex-row flex-wrap gap-2">{filters.map(item => <Pressable key={item.key} onPress={() => onFilter(item.key)} className={`rounded-lg px-3 py-2 ${filter === item.key ? 'bg-brand' : 'bg-white dark:bg-slate-900'}`}><Text className={`text-[10px] font-semibold ${filter === item.key ? 'text-white' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View><View className="mt-3 flex-row items-center gap-2"><View className="flex-1 flex-row items-center rounded-xl bg-white px-3 dark:bg-slate-900"><Feather name="search" size={15} color="#64718B" /><TextInput value={search} onChangeText={onSearch} placeholder="Search questions..." placeholderTextColor="#94A3B8" className="flex-1 px-2 py-2 text-xs text-[#172038] dark:text-white" /></View><View className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900"><Text className="text-[10px] text-muted">Most recent⌄</Text></View></View>{questions.length ? questions.map(question => <QuestionCard key={question.id} question={question} />) : <Empty title="No questions yet" body="Questions about this teacher's courses will appear here." />}<Button className="mt-4" onPress={onAsk}>Ask a Question</Button></View>
}

function QuestionCard({ question }: { question: CourseQuestion }) { return <Card className="mt-3 p-3"><View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="h-8 w-8 items-center justify-center rounded-full bg-slate-200"><Text className="text-xs font-bold text-slate-600">{question.anonymous ? 'A' : 'S'}</Text></View><View><Text className="text-xs font-bold text-[#172038] dark:text-white">{question.anonymous ? 'Anonymous Student' : 'Student'}</Text><Text className="text-[10px] text-muted">{new Date(question.createdAt).toLocaleDateString()}</Text></View></View><Text className="rounded-md bg-blue-50 px-2 py-1 text-[9px] text-brand dark:bg-slate-800">{question.category}</Text></View><Text className="mt-3 text-xs font-semibold leading-5 text-[#172038] dark:text-white">{question.text}</Text>{question.answers?.filter(answer => answer.authorRole === 'teacher').map(answer => <View key={answer.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-[10px] font-bold text-[#172038] dark:text-white">{answer.authorName}</Text><Text className="mt-1 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">{answer.text}</Text></View>)}<View className="mt-3 flex-row justify-between"><Text className="text-[10px] text-muted"><Feather name="thumbs-up" size={11} color="#172038" /> 6</Text><Text className="text-[10px] text-muted"><Feather name="message-circle" size={11} color="#172038" /> {question.answers?.length ?? 0} replies</Text></View></Card> }
function Contact({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) { return <View className="flex-row items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Feather name={icon} size={17} color="#52627A" /><Text className="flex-1 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">{label}</Text></View> }
function TeacherBottomNav() { const tabs = [{ label: 'Home', icon: 'home', href: '/(student-tabs)/home' }, { label: 'Courses', icon: 'book-open', href: '/(student-tabs)/courses' }, { label: 'Teachers', icon: 'users', href: '/(student-tabs)/professors' }, { label: 'Activity', icon: 'clock', href: '/(student-tabs)/activity' }] as const; return <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-[#E7EAF0] bg-white px-1 pb-3 pt-2 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} className="flex-1 items-center"><Feather name={tab.icon} size={20} color={tab.label === 'Teachers' ? '#1670F8' : '#7A879A'} /><Text className={`mt-1 text-[10px] font-semibold ${tab.label === 'Teachers' ? 'text-[#1670F8]' : 'text-[#7A879A]'}`}>{tab.label}</Text></Pressable>)}</View> }
function initials(name: string) { const parts = name.trim().split(/\s+/); return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() }
function isTab(value: string | undefined): value is Tab { return value === 'overview' || value === 'reviews' || value === 'questions' }
