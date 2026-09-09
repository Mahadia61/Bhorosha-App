import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, Professor, ProfessorReview } from '@/lib/types'

type Tab = 'overview' | 'reviews' | 'questions'

export default function ProfessorDetail() {
  const { id, tab: requestedTab } = useLocalSearchParams<{ id: string; tab?: string }>()
  const { profile, isDark } = useApp()
  const [tab, setTab] = useState<Tab>(isTab(requestedTab) ? requestedTab : 'overview')
  const [teacher, setTeacher] = useState<Professor | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<ProfessorReview[]>([])
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<'all' | 'course' | 'academic' | 'other'>('all')
  const [questionText, setQuestionText] = useState('')
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const [people, allCourses] = await Promise.all([services.professors(), services.courses()])
      const nextTeacher = people.find(person => person.id === id)
      if (!nextTeacher) throw new Error('This teacher profile is no longer available.')
      const nextCourses = allCourses.filter(course => course.teacherIds.includes(id) || course.teacherNames.includes(nextTeacher.name))
      const [nextReviews, nextQuestions] = await Promise.all([
        services.professorReviews(id),
        Promise.all(nextCourses.map(course => services.courseQuestions(course.id))),
      ])
      setTeacher(nextTeacher); setCourses(nextCourses); setReviews(nextReviews); setQuestions(nextQuestions.flat())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this teacher.')
    }
  }, [id])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (isTab(requestedTab)) setTab(requestedTab) }, [requestedTab])

  const visibleReviews = useMemo(() => reviews.filter(review => `${review.text} ${review.anonymous ? 'anonymous student' : review.displayName ?? 'student'}`.toLowerCase().includes(search.toLowerCase())), [reviews, search])
  const visibleQuestions = useMemo(() => questions.filter(question => {
    const matchesCategory = category === 'all' || question.category.toLowerCase().includes(category === 'course' ? 'course' : category)
    return matchesCategory && question.text.toLowerCase().includes(search.toLowerCase())
  }), [questions, category, search])
  const selectTab = (next: Tab) => { setTab(next); router.setParams({ tab: next }) }
  const openTeacherForm = (form: 'review' | 'question') => router.push(`/professor/${form}?id=${encodeURIComponent(id)}` as never)

  const askQuestion = async () => {
    const course = courses[0]
    if (!course) return Alert.alert('No course available', 'This teacher has no assigned course yet.')
    if (!questionText.trim()) return Alert.alert('Write a question', 'Enter a question for this teacher.')
    setSubmitting(true)
    try { await services.addCourseQuestion({ courseId: course.id, category: 'Other', text: questionText.trim(), anonymous: true }); setQuestionText(''); await load(); Alert.alert('Question posted', 'The teacher can now respond.') }
    catch (reason) { Alert.alert('Could not post question', reason instanceof Error ? reason.message : 'Please try again.') }
    finally { setSubmitting(false) }
  }
  const submitReview = async () => {
    if (!reviewText.trim()) return Alert.alert('Write a review', 'Please add constructive feedback.')
    setSubmitting(true)
    try { await services.addProfessorReview({ professorId: id, text: reviewText.trim(), rating: 5, anonymous: true }); setReviewText(''); await load(); Alert.alert('Review submitted', 'Thank you for your feedback.') }
    catch (reason) { Alert.alert('Could not submit review', reason instanceof Error ? reason.message : 'Please try again.') }
    finally { setSubmitting(false) }
  }

  if (error) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F6F8] px-6 dark:bg-slate-950"><Text className="text-center text-muted">{error}</Text></SafeAreaView>
  if (!teacher) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F6F8] dark:bg-slate-950"><Text className="text-muted">Loading teacher…</Text></SafeAreaView>

  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 118 }}>
      <View className="flex-row items-center justify-between pt-3"><Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center"><Feather name="arrow-left" size={21} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable><View className="flex-row items-center gap-3"><Pressable onPress={() => router.push('/student-notifications' as never)}><Feather name="bell" size={19} color={isDark ? '#E2E8F0' : '#111318'} /></Pressable><Pressable onPress={() => router.push('/(tabs)/profile' as never)} className="h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable></View></View>
      <View className="mt-4 flex-row items-center gap-3"><View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xl font-extrabold text-brand">{initials(teacher.name)}</Text></View><View className="flex-1"><Text className="text-base font-extrabold text-[#172038] dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-[#52627A] dark:text-slate-300">{teacher.designation || 'Faculty member'}</Text><Text className="text-xs text-[#64718B] dark:text-slate-400">Department of {teacher.department}</Text><Text className="mt-1 text-[10px] text-[#64718B] dark:text-slate-400">{teacher.email}</Text></View></View>
      <View className="mt-5 flex-row border-b border-[#E1E6EF] dark:border-slate-800">{(['overview', 'reviews', 'questions'] as const).map(item => <Pressable key={item} onPress={() => selectTab(item)} className="flex-1 items-center pb-3"><Text className={`text-xs font-bold ${tab === item ? 'text-brand' : 'text-[#64718B] dark:text-slate-400'}`}>{item === 'questions' ? 'Q&A' : item.charAt(0).toUpperCase() + item.slice(1)}</Text>{tab === item ? <View className="absolute bottom-0 h-0.5 w-full bg-brand" /> : null}</Pressable>)}</View>
      {tab === 'overview' ? <Overview courses={courses} teacher={teacher} onAsk={() => selectTab('questions')} onReview={() => selectTab('reviews')} /> : null}
      {tab === 'reviews' ? <Reviews reviews={visibleReviews} search={search} onSearch={setSearch} reviewText={reviewText} onReviewText={setReviewText} onSubmit={submitReview} submitting={submitting} /> : null}
      {tab === 'questions' ? <Questions questions={visibleQuestions} category={category} onCategory={setCategory} search={search} onSearch={setSearch} text={questionText} onText={setQuestionText} onSubmit={askQuestion} submitting={submitting} /> : null}
    </ScrollView>
    <TeacherBottomNav />
  </SafeAreaView>
}

function Overview({ courses, teacher, onAsk, onReview }: { courses: Course[]; teacher: Professor; onAsk: () => void; onReview: () => void }) {
  return <View><Text className="mt-6 text-base font-extrabold text-[#172038] dark:text-white">Courses Taught <Text className="float-right text-xs font-bold text-brand">See all</Text></Text><Card className="mt-3 p-0">{courses.length ? courses.map((course, index) => <Pressable key={course.id} onPress={() => router.push(`/course/${course.id}`)} className={`flex-row items-center px-4 py-3 ${index ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}><View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800"><Text className="text-center text-[10px] font-extrabold leading-3 text-brand">{course.code.split(' ').join('\n')}</Text></View><View className="ml-3 flex-1"><Text className="text-sm font-bold text-[#172038] dark:text-white">{course.title}</Text><Text className="mt-1 text-xs text-muted">{course.level ? `Level ${course.level}` : 'Level —'} · {course.term ? `Term ${course.term}` : 'Term —'}</Text></View><Feather name="chevron-right" size={18} color="#172038" /></Pressable>) : <Empty title="No courses assigned" body="Assigned courses will appear here." />}</Card><Text className="mt-6 text-base font-extrabold text-[#172038] dark:text-white">Contact</Text><Card className="mt-3"><Contact icon="mail" label={teacher.email ?? 'Not provided'} /><Contact icon="users" label={`Department of ${teacher.department}`} /><Contact icon="map-pin" label="CUET, Chattogram" /></Card><View className="mt-5 flex-row gap-3"><Button className="flex-1" variant="outline" onPress={() => router.push(`/professor/question?id=${encodeURIComponent(teacher.id)}` as never)}>Ask a Question</Button><Button className="flex-1" onPress={() => router.push(`/professor/review?id=${encodeURIComponent(teacher.id)}` as never)}>Write a Review</Button></View></View>
}

function Reviews({ reviews, search, onSearch, reviewText, onReviewText, onSubmit, submitting }: { reviews: ProfessorReview[]; search: string; onSearch: (value: string) => void; reviewText: string; onReviewText: (value: string) => void; onSubmit: () => void; submitting: boolean }) {
  return <View><View className="mt-5 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={16} color="#64718B" /><TextInput value={search} onChangeText={onSearch} placeholder="Search reviews…" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white" /></View><View className="mt-3 flex-row items-center justify-between"><Text className="text-xs text-muted">{reviews.length} reviews</Text><Text className="text-xs font-semibold text-[#172038] dark:text-white">Most recent⌄</Text></View>{reviews.length ? reviews.map(review => <Card key={review.id} className="mt-3"><View className="flex-row items-center gap-3"><View className="h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700"><Text className="font-bold text-slate-600 dark:text-slate-200">{review.anonymous ? 'A' : initials(review.displayName ?? 'Student')}</Text></View><View className="flex-1"><Text className="text-sm font-bold text-[#172038] dark:text-white">{review.anonymous ? 'Anonymous Student' : review.displayName ?? 'Named Student'}</Text><Text className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()}</Text></View></View><Text className="mt-3 leading-5 text-[#52627A] dark:text-slate-300">{review.text}</Text><View className="mt-3 flex-row items-center justify-between"><View className="flex-row gap-2"><Text className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-muted dark:bg-slate-800">Helpful</Text><Text className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-muted dark:bg-slate-800">Supportive</Text></View><Text className="text-xs text-rose-600">Report</Text></View></Card>) : <Empty title="No reviews yet" body="Student feedback will appear here." />}<Card className="mt-5"><Text className="text-sm font-bold text-[#172038] dark:text-white">Write a Review</Text><TextInput multiline value={reviewText} onChangeText={onReviewText} placeholder="Share constructive feedback…" placeholderTextColor="#94A3B8" className="mt-3 min-h-20 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:text-white" /><Button className="mt-3" loading={submitting} onPress={onSubmit}>Write a Review</Button></Card></View>
}

function Questions({ questions, category, onCategory, search, onSearch, text, onText, onSubmit, submitting }: { questions: CourseQuestion[]; category: string; onCategory: (value: 'all' | 'course' | 'academic' | 'other') => void; search: string; onSearch: (value: string) => void; text: string; onText: (value: string) => void; onSubmit: () => void; submitting: boolean }) {
  const filters = [{ key: 'all', label: 'All' }, { key: 'course', label: 'Course Related' }, { key: 'academic', label: 'Academic' }, { key: 'other', label: 'Other' }] as const
  return <View><View className="mt-5 flex-row flex-wrap gap-2">{filters.map(item => <Pressable key={item.key} onPress={() => onCategory(item.key)} className={`rounded-xl px-3 py-2 ${category === item.key ? 'bg-brand' : 'bg-white dark:bg-slate-900'}`}><Text className={`text-xs font-semibold ${category === item.key ? 'text-white' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View><View className="mt-3 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={16} color="#64718B" /><TextInput value={search} onChangeText={onSearch} placeholder="Search questions…" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white" /></View>{questions.length ? questions.map(question => <Card key={question.id} className="mt-3"><View className="flex-row items-center justify-between"><Text className="text-xs font-bold text-brand">{question.anonymous ? 'Anonymous Student' : 'Named Student'}</Text><Text className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] text-brand dark:bg-slate-800">{question.category}</Text></View><Text className="mt-3 text-sm leading-5 text-[#52627A] dark:text-slate-300">{question.text}</Text>{question.answers?.map(answer => <View key={answer.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">TEACHER REPLY</Text><Text className="mt-1 text-sm leading-5 text-[#52627A] dark:text-slate-300">{answer.text}</Text></View>)}<View className="mt-3 flex-row justify-between"><Text className="text-xs text-muted"><Feather name="message-circle" size={13} color="#64718B" /> {question.answers?.length ?? 0} replies</Text><Text className="text-xs text-rose-600">Report</Text></View></Card>) : <Empty title="No questions yet" body="Questions about this teacher's courses will appear here." />}<Card className="mt-5"><Text className="text-sm font-bold text-[#172038] dark:text-white">Ask a Question</Text><TextInput multiline value={text} onChangeText={onText} placeholder="Ask about a course or academic topic…" placeholderTextColor="#94A3B8" className="mt-3 min-h-20 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:text-white" /><Button className="mt-3" loading={submitting} onPress={onSubmit}>Ask a Question</Button></Card></View>
}

function Contact({ icon, label }: { icon: keyof typeof Feather.glyphMap; label: string }) { return <View className="flex-row items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"><Feather name={icon} size={17} color="#52627A" /><Text className="text-sm text-[#52627A] dark:text-slate-300">{label}</Text></View> }
function TeacherBottomNav() { const tabs = [{ label: 'Home', icon: 'home', href: '/(student-tabs)/home' }, { label: 'Courses', icon: 'book-open', href: '/(student-tabs)/courses' }, { label: 'Teachers', icon: 'users', href: '/(student-tabs)/professors' }, { label: 'Activity', icon: 'clock', href: '/(student-tabs)/activity' }] as const; return <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-[#E7EAF0] bg-white px-1 pb-3 pt-2 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} className="flex-1 items-center"><Feather name={tab.icon} size={20} color={tab.label === 'Teachers' ? '#1670F8' : '#7A879A'} /><Text className={`mt-1 text-[10px] font-semibold ${tab.label === 'Teachers' ? 'text-[#1670F8]' : 'text-[#7A879A]'}`}>{tab.label}</Text></Pressable>)}</View> }
function initials(name: string) { const parts = name.trim().split(/\s+/); return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() }
function isTab(value: string | undefined): value is Tab { return value === 'overview' || value === 'reviews' || value === 'questions' }
