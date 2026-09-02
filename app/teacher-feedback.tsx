import { useEffect, useMemo, useState } from 'react'
import { FlatList, SafeAreaView, Text, TextInput, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import { summarizeReviews } from '@/lib/ai-summary'
import type { Course, ProfessorReview, Review } from '@/lib/types'

export default function TeacherFeedback({ inTab = false }: { inTab?: boolean }) {
  const { profile } = useApp(); const [courses, setCourses] = useState<Course[]>([]); const [reviews, setReviews] = useState<Review[]>([]); const [teacherReviews, setTeacherReviews] = useState<ProfessorReview[]>([]); const [search, setSearch] = useState(''); const [summary, setSummary] = useState(''); const [summarizing, setSummarizing] = useState(false)
  const load = async () => { if (!profile) return; const assigned = (await services.courses()).filter(course => course.teacherIds.includes(profile.id)); const [courseReviews, personalReviews] = await Promise.all([Promise.all(assigned.map(course => services.reviews(course.id))), services.professorReviews(profile.id)]); setCourses(assigned); setReviews(courseReviews.flat()); setTeacherReviews(personalReviews) }
  useEffect(() => { void load() }, [profile])
  const visible = useMemo(() => reviews.filter(review => review.text.toLowerCase().includes(search.toLowerCase())), [reviews, search])
  const generateSummary = async () => { setSummarizing(true); try { const result = await summarizeReviews('your assigned courses', reviews); setSummary(result.summary) } finally { setSummarizing(false) } }
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><FlatList data={visible} keyExtractor={review => review.id} contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
    ListHeaderComponent={<>{!inTab ? <Text onPress={() => router.back()} className="mt-2 text-sm font-semibold text-brand">← Back</Text> : null}<Text className={`${inTab ? 'mt-2' : 'mt-6'} text-2xl font-bold text-ink dark:text-white`}>Student feedback</Text><Text className="mt-1 text-sm text-muted">Anonymous feedback for your assigned courses.</Text><Text onPress={() => { void generateSummary() }} className="mt-4 self-start rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-brand dark:bg-slate-800">{summarizing ? 'Preparing summary…' : 'Generate AI review summary'}</Text>{summary ? <Card className="mt-3 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900"><Text className="text-xs font-bold text-brand">REVIEW SUMMARY</Text><Text className="mt-2 text-sm leading-5 text-ink dark:text-white">{summary}</Text></Card> : null}<View className="mt-5 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"><TextInput value={search} onChangeText={setSearch} placeholder="Search feedback" placeholderTextColor="#94A3B8" className="py-3 text-base text-ink dark:text-white" /></View><Text className="mt-5 mb-3 text-sm font-semibold text-muted">{courses.length} assigned course{courses.length === 1 ? '' : 's'}</Text></>}
    ListEmptyComponent={<Empty title="No feedback yet" body="Student reviews for your assigned courses will appear here." />}
    ListFooterComponent={teacherReviews.length ? <><Text className="mt-5 text-lg font-bold text-ink dark:text-white">Reviews about you</Text>{teacherReviews.map(review => <Card key={review.id} className="mt-3"><Stars value={review.rating} /><Text className="mt-3 text-ink dark:text-white">{review.text}</Text><Text className="mt-2 text-xs text-muted">{review.anonymous ? 'Anonymous student' : 'Student'}</Text></Card>)}</> : null}
    renderItem={({ item }) => { const course = courses.find(value => value.id === item.courseId); return <Card className="mb-3"><Text className="text-xs font-bold text-brand">{course?.code ?? 'Course'}</Text><Text className="mt-1 font-semibold text-ink dark:text-white">{course?.title ?? 'Course feedback'}</Text><View className="mt-3"><Stars value={Object.values(item.ratings).reduce((a, b) => a + b, 0) / 5} /></View><Text className="mt-3 leading-5 text-muted">{item.text}</Text><Text className="mt-3 text-xs text-muted">{item.anonymous ? 'Anonymous student' : 'Student'} · {new Date(item.createdAt).toLocaleDateString()}</Text></Card> }} />
  </SafeAreaView>
}
