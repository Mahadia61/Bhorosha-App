import { useEffect, useMemo, useState } from 'react'
import { Alert, Image, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Empty, Stars } from '@/components/ui'
import { services } from '@/lib/services'
import { summarizeReviews } from '@/lib/ai-summary'
import { useApp } from '@/providers/AppProvider'
import type { Course, Professor, ProfessorReview } from '@/lib/types'

export default function ProfessorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useApp()
  const [professor, setProfessor] = useState<Professor | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [reviews, setReviews] = useState<ProfessorReview[]>([])
  const [text, setText] = useState('')
  const [rating, setRating] = useState(5)
  const [anonymous, setAnonymous] = useState(true)
  const [loading, setLoading] = useState(false); const [summary, setSummary] = useState(''); const [summarizing, setSummarizing] = useState(false); const [loadError, setLoadError] = useState('')
  const studentCanReview = profile?.role === 'student'

  const load = async () => {
    try {
      setLoadError('')
      if (profile?.role === 'teacher' && profile.id !== id) throw new Error('Teachers can view feedback only for their own profile.')
      const [people, allCourses, feedback] = await Promise.all([services.professors(), services.courses(), services.professorReviews(id)])
      const nextProfessor = people.find(person => person.id === id) ?? null
      if (!nextProfessor) throw new Error('This teacher profile is no longer available.')
      setProfessor(nextProfessor)
      setCourses(allCourses.filter(course => course.teacherIds.includes(id)))
      setReviews(feedback)
    } catch (reason) { setLoadError(reason instanceof Error ? reason.message : 'Unable to load this teacher.') }
  }
  useEffect(() => { void load() }, [id, profile?.id, profile?.role])
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0, [reviews])
  const generateSummary = async () => { setSummarizing(true); try { const result = await summarizeReviews({ type: 'teacher', id, label: professor?.name ?? 'this teacher' }, reviews); setSummary(result.summary) } catch (reason) { Alert.alert('Could not generate summary', reason instanceof Error ? reason.message : 'Please try again.') } finally { setSummarizing(false) } }
  const submit = async () => {
    if (!studentCanReview) return Alert.alert('Student account required', 'Only students can submit teacher reviews.')
    if (!profile || !text.trim()) return Alert.alert('Write a review', 'Please add constructive feedback.')
    setLoading(true)
    try {
      await services.addProfessorReview({ professorId: id, text: text.trim(), rating, anonymous })
      setText(''); await load(); Alert.alert('Review submitted', 'Thank you for your feedback.')
    } catch (reason) {
      Alert.alert('Could not submit', reason instanceof Error ? reason.message : 'Please try again.')
    } finally { setLoading(false) }
  }

  if (loadError) return <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6"><Text className="text-center text-muted">{loadError}</Text><Text onPress={() => router.back()} className="mt-4 text-sm font-semibold text-brand">Go back</Text></SafeAreaView>
  if (!professor) return <SafeAreaView className="flex-1 items-center justify-center bg-surface"><Text className="text-muted">Loading teacher…</Text></SafeAreaView>
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
    <Text onPress={() => router.back()} className="mt-4 text-sm font-semibold text-brand">← Back</Text>
    <View className="mt-6 flex-row items-center gap-4">{professor.photoUrl ? <Image source={{ uri: professor.photoUrl }} className="h-16 w-16 rounded-full bg-slate-200" /> : <View className="h-16 w-16 items-center justify-center rounded-full bg-brand"><Text className="text-2xl font-bold text-white">{professor.name.trim().charAt(0).toUpperCase() || 'T'}</Text></View>}<View className="flex-1"><Text className="text-2xl font-bold text-ink dark:text-white">{professor.name}</Text><Text className="mt-1 text-muted">{professor.designation ? `${professor.designation} · ` : ''}{professor.department}</Text></View></View>
    {professor.bio ? <Text className="mt-4 leading-5 text-muted">{professor.bio}</Text> : null}
    <Card className="mt-5 flex-row items-center justify-between"><View><Text className="font-medium text-ink dark:text-white">Teacher rating</Text><Text className="mt-1 text-xs text-muted">{reviews.length} student reviews</Text></View><View><Stars value={average} /><Text className="mt-1 text-right text-xs font-bold text-ink dark:text-white">{average ? average.toFixed(1) : '—'} / 5</Text></View></Card><Text onPress={() => { void generateSummary() }} className="mt-3 self-start rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-brand dark:bg-slate-800">{summarizing ? 'Preparing AI summary…' : 'Generate AI review summary'}</Text>{summary ? <Card className="mt-3 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900"><Text className="text-xs font-bold text-brand">AI REVIEW SUMMARY</Text><Text className="mt-2 text-sm leading-5 text-ink dark:text-white">{summary}</Text></Card> : null}
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">Courses taught</Text>{courses.length ? courses.map(course => <Card key={course.id} className="mt-3"><Text onPress={() => router.push(`/course/${course.id}`)} className="text-xs font-bold text-brand">{course.code}</Text><Text onPress={() => router.push(`/course/${course.id}`)} className="mt-1 font-semibold text-ink dark:text-white">{course.title}</Text></Card>) : <Text className="mt-2 text-sm text-muted">No assigned courses yet.</Text>}
    {studentCanReview ? <><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Ask a question</Text><Card className="mt-3"><Text className="text-sm text-muted">Questions are linked to a course so every assigned teacher can respond.</Text>{courses.length ? <Button className="mt-3" variant="outline" onPress={() => router.push(`/course/${courses[0].id}`)}>Ask about {courses[0].code}</Button> : null}</Card><Text className="mt-7 text-lg font-bold text-ink dark:text-white">Rate this teacher</Text><Card className="mt-3"><View className="flex-row items-center justify-between"><Text className="font-medium text-ink dark:text-white">Overall rating</Text><Stars value={rating} onChange={setRating} /></View><TextInput multiline value={text} onChangeText={setText} placeholder="Share feedback in বাংলা or English" placeholderTextColor="#94A3B8" className="mt-4 min-h-24 rounded-xl border border-slate-200 p-3 text-base text-ink dark:border-slate-700 dark:text-white" /><View className="mt-4 flex-row items-center justify-between"><Text className="font-medium text-ink dark:text-white">Post anonymously</Text><Switch value={anonymous} onValueChange={setAnonymous} /></View><Button className="mt-4" loading={loading} onPress={submit}>Submit review</Button></Card></> : null}
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">Student feedback</Text>{reviews.length ? reviews.map(review => <Card key={review.id} className="mt-3"><View className="flex-row justify-between"><Stars value={review.rating} /><Text className="text-xs text-muted">{review.anonymous ? 'Anonymous student' : review.displayName ?? 'Student'}</Text></View><Text className="mt-3 text-ink dark:text-slate-200">{review.text}</Text>{review.responses?.map(response => <View key={response.id} className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-slate-700 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">TEACHER RESPONSE · {response.teacherName}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{response.text}</Text></View>)}</Card>) : <Empty title="No reviews yet" body="Student feedback will appear here." />}
  </ScrollView></SafeAreaView>
}
