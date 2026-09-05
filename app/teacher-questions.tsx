import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect, router } from 'expo-router'
import { Button, Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion } from '@/lib/types'
import { TeacherHeader } from '@/components/TeacherHeader'

export default function TeacherQuestions({ inTab = false }: { inTab?: boolean }) {
  const { profile } = useApp()
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all')

  const load = useCallback(async () => {
    if (!profile) return
    const [nextQuestions, nextCourses] = await Promise.all([services.teacherQuestions(profile.id), services.courses()])
    setQuestions(nextQuestions)
    setCourses(nextCourses)
  }, [profile])

  useEffect(() => { void load() }, [load])

  const answer = async (question: CourseQuestion) => {
    const text = drafts[question.id]?.trim()
    if (!text) return Alert.alert('Write a response', 'Enter an answer before posting.')
    setSending(question.id)
    try {
      if (!profile) return
      await services.addQuestionAnswer(question.id, profile, text)
      setDrafts(current => ({ ...current, [question.id]: '' }))
      await load()
      Alert.alert('Response posted', 'The student can now see your answer.')
    } catch (reason) {
      Alert.alert('Could not post response', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSending(null)
    }
  }
  const visibleQuestions = questions.filter(question => filter === 'all' || (filter === 'answered' ? (question.answers ?? []).some(item => item.authorRole === 'teacher') : !(question.answers ?? []).some(item => item.authorRole === 'teacher')))

  if (profile?.role !== 'teacher') return <Redirect href="/" />
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
    <TeacherHeader title="Course Q&A" />
    <Text className="mt-1 text-sm text-muted">Answer students without exposing their identity. বাংলা and English are both supported.</Text><View className="mt-5 flex-row gap-2">{(['all', 'unanswered', 'answered'] as const).map(option => <Pressable key={option} onPress={() => setFilter(option)} className={`rounded-full px-3 py-2 ${filter === option ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold capitalize ${filter === option ? 'text-white' : 'text-muted'}`}>{option}</Text></Pressable>)}</View>
    {visibleQuestions.length ? visibleQuestions.map(question => {
      const course = courses.find(value => value.id === question.courseId)
      return <Card key={question.id} className="mt-4">
        <Text className="text-xs font-bold text-brand">{course?.code ?? 'Course'} · {question.category}</Text>
        <Text className="mt-2 leading-5 text-ink dark:text-white">{question.text}</Text>
        {question.answers?.length ? question.answers.map(answer => <View key={answer.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{answer.authorRole === 'teacher' ? 'TEACHER RESPONSE' : 'STUDENT RESPONSE'}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{answer.text}</Text></View>) : null}<TextInput multiline value={drafts[question.id] ?? ''} onChangeText={text => setDrafts(current => ({ ...current, [question.id]: text }))} placeholder="Write in বাংলা or English" placeholderTextColor="#94A3B8" className="mt-4 min-h-20 rounded-xl border border-slate-200 p-3 text-base text-ink dark:border-slate-700 dark:text-white" /><Button className="mt-3" loading={sending === question.id} onPress={() => answer(question)}>Post teacher answer</Button>
      </Card>
    }) : <Empty title="No course questions" body="Questions from students in your assigned courses will appear here." />}
  </ScrollView></SafeAreaView>
}
