import { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Button, Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion } from '@/lib/types'

export default function TeacherQuestions() {
  const { profile } = useApp(); const [questions, setQuestions] = useState<CourseQuestion[]>([]); const [courses, setCourses] = useState<Course[]>([]); const [drafts, setDrafts] = useState<Record<string, string>>({}); const [sending, setSending] = useState<string | null>(null)
  const load = async () => { if (!profile) return; setQuestions(await services.teacherQuestions(profile.id)); setCourses(await services.courses()) }
  useEffect(() => { void load() }, [profile])
  const answer = async (question: CourseQuestion) => { const text = drafts[question.id]?.trim(); if (!text) return Alert.alert('Write a response', 'Enter an answer before posting.'); setSending(question.id); try { await services.answerCourseQuestion(question.id, text); setDrafts(current => ({ ...current, [question.id]: '' })); await load(); Alert.alert('Response posted', 'The student can now see your answer.') } finally { setSending(null) } }
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}><Text onPress={() => router.back()} className="mt-2 text-sm font-semibold text-brand">← Back</Text><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Course Q&A</Text><Text className="mt-1 text-sm text-muted">Answer students without exposing their identity.</Text>{questions.length ? questions.map(question => { const course = courses.find(value => value.id === question.courseId); return <Card key={question.id} className="mt-4"><Text className="text-xs font-bold text-brand">{course?.code ?? 'Course'}</Text><Text className="mt-2 leading-5 text-ink dark:text-white">{question.text}</Text>{question.answerText ? <View className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">YOUR RESPONSE</Text><Text className="mt-1 text-sm text-ink dark:text-white">{question.answerText}</Text></View> : <><TextInput multiline value={drafts[question.id] ?? ''} onChangeText={text => setDrafts(current => ({ ...current, [question.id]: text }))} placeholder="Write a clear, helpful answer" placeholderTextColor="#94A3B8" className="mt-4 min-h-20 rounded-xl border border-slate-200 p-3 text-base text-ink dark:border-slate-700 dark:text-white" /><Button className="mt-3" loading={sending === question.id} onPress={() => answer(question)}>Post answer</Button></>}</Card> }) : <Empty title="No course questions" body="Questions from students in your assigned courses will appear here." />}</ScrollView></SafeAreaView>
}
