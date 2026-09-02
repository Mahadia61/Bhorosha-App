import { useEffect, useMemo, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Empty, Stars } from '@/components/ui'
import { defaultRatings, services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, RatingMap, Review } from '@/lib/types'

const labels: Record<keyof RatingMap, string> = { teachingQuality: 'Teaching quality', workload: 'Workload', gradingFairness: 'Grading fairness', courseStructure: 'Course structure', availability: 'Availability' }

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { profile } = useApp()
  const [course, setCourse] = useState<Course | null>(null); const [reviews, setReviews] = useState<Review[]>([]); const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [reviewText, setReviewText] = useState(''); const [questionText, setQuestionText] = useState(''); const [anonymous, setAnonymous] = useState(true); const [ratings, setRatings] = useState<RatingMap>(defaultRatings); const [sending, setSending] = useState(false)
  const load = async () => { const [nextCourse, nextReviews, nextQuestions] = await Promise.all([services.course(id), services.reviews(id), services.courseQuestions(id)]); setCourse(nextCourse); setReviews(nextReviews); setQuestions(nextQuestions) }
  useEffect(() => { void load() }, [id])
  const average = useMemo(() => reviews.length ? reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((a, b) => a + b, 0) / 5, 0) / reviews.length : 0, [reviews])
  const submitReview = async () => { if (!profile || !reviewText.trim()) return Alert.alert('Write a review', 'Please add constructive feedback first.'); setSending(true); try { await services.addReview({ courseId: id, authorId: profile.id, text: reviewText.trim(), ratings, anonymous }); setReviewText(''); setRatings(defaultRatings); await load(); Alert.alert('Review submitted', 'Thank you for helping future students.') } finally { setSending(false) } }
  const submitQuestion = async () => { if (!profile || !questionText.trim()) return Alert.alert('Write a question', 'Enter your question for the course teacher.'); setSending(true); try { await services.addCourseQuestion({ courseId: id, authorId: profile.id, text: questionText.trim(), anonymous: true }); setQuestionText(''); await load(); Alert.alert('Question posted', 'The course teacher can now respond.') } finally { setSending(false) } }
  if (!course) return <SafeAreaView className="flex-1 items-center justify-center bg-surface"><Text className="text-muted">Loading course…</Text></SafeAreaView>
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
    <Text onPress={() => router.back()} className="mt-4 text-sm font-semibold text-brand">← Back</Text>
    <Text className="mt-6 text-xs font-bold text-brand">{course.code}</Text><Text className="mt-1 text-2xl font-bold text-ink dark:text-white">{course.title}</Text><Text className="mt-2 text-sm text-muted">{course.teacherName} · {course.semester} · {course.credits} credits</Text>
    <Card className="mt-5 flex-row items-center justify-between"><View><Text className="font-medium text-ink dark:text-white">Community rating</Text><Text className="mt-1 text-xs text-muted">Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}</Text></View><View><Stars value={average} /><Text className="mt-1 text-right text-xs font-bold text-ink dark:text-white">{average ? average.toFixed(1) : '—'} / 5</Text></View></Card>
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">Share a course review</Text><Text className="mt-1 text-sm text-muted">Rate each area and leave feedback that helps students choose well.</Text>
    <Card className="mt-3">{(Object.keys(ratings) as (keyof RatingMap)[]).map(key => <View key={key} className="mb-4 flex-row items-center justify-between"><Text className="text-sm text-ink dark:text-slate-200">{labels[key]}</Text><Stars value={ratings[key]} onChange={value => setRatings(current => ({ ...current, [key]: value }))} /></View>)}
      <TextInput multiline value={reviewText} onChangeText={setReviewText} placeholder="What should future students know?" placeholderTextColor="#94A3B8" className="min-h-24 rounded-xl border border-slate-200 p-3 text-base text-ink dark:border-slate-700 dark:text-white" />
      <View className="mt-4 flex-row items-center justify-between"><View><Text className="font-medium text-ink dark:text-white">Post anonymously</Text><Text className="text-xs text-muted">Your identity is hidden from other users.</Text></View><Switch value={anonymous} onValueChange={setAnonymous} /></View><Button className="mt-4" loading={sending} onPress={submitReview}>Submit review</Button>
    </Card>
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">Ask the teacher</Text><Card className="mt-3"><TextInput multiline value={questionText} onChangeText={setQuestionText} placeholder="Ask an anonymous course question" placeholderTextColor="#94A3B8" className="min-h-20 rounded-xl border border-slate-200 p-3 text-base text-ink dark:border-slate-700 dark:text-white" /><Button className="mt-3" variant="outline" loading={sending} onPress={submitQuestion}>Post anonymous question</Button></Card>
    {questions.length ? questions.map(question => <Card key={question.id} className="mt-3"><Text className="text-sm text-ink dark:text-slate-200">{question.text}</Text>{question.answerText ? <View className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">TEACHER RESPONSE</Text><Text className="mt-1 text-sm text-ink dark:text-white">{question.answerText}</Text></View> : <Text className="mt-3 text-xs text-muted">Awaiting a teacher response</Text>}</Card>) : <Empty title="No questions yet" body="Ask the first question about this course." />}
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">Student reviews</Text>{reviews.length ? reviews.map(review => <Card key={review.id} className="mt-3"><View className="flex-row items-center justify-between"><Stars value={Object.values(review.ratings).reduce((a, b) => a + b, 0) / 5} /><Text className="text-xs text-muted">{review.anonymous ? 'Anonymous student' : 'Student'}</Text></View><Text className="mt-3 leading-5 text-ink dark:text-slate-200">{review.text}</Text></Card>) : <Empty title="No reviews yet" body="Be the first to share feedback for this course." />}
  </ScrollView></SafeAreaView>
}
