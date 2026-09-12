import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card } from '@/components/ui/ui'
import { services } from '@/lib/services/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, CourseQuestion, Professor, ProfessorReview, Review } from '@/lib/types/types'

type DetailKind = 'courseReview' | 'professorReview' | 'question' | 'answer'

export default function ActivityDetail() {
  const { id, kind: requestedKind, courseId, professorId, questionId } = useLocalSearchParams<{ id: string; kind?: string; courseId?: string; professorId?: string; questionId?: string }>()
  const { profile, isDark } = useApp()
  const kind = isKind(requestedKind) ? requestedKind : 'answer'
  const [course, setCourse] = useState<Course | null>(null)
  const [teacher, setTeacher] = useState<Professor | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [teacherReview, setTeacherReview] = useState<ProfessorReview | null>(null)
  const [question, setQuestion] = useState<CourseQuestion | null>(null)
  const [notification, setNotification] = useState<{ title: string; body: string; createdAt: number; questionId?: string; courseId?: string } | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [courses, teachers] = await Promise.all([services.courses(), services.professors()])
      setCourse(courses.find(item => item.id === courseId) ?? null); setTeacher(teachers.find(item => item.id === professorId) ?? null)
      if (kind === 'courseReview' && profile) setReview((await services.myReviews(profile.id)).find(item => item.id === id) ?? null)
      if (kind === 'professorReview' && profile) setTeacherReview((await services.myProfessorReviews(profile.id)).find(item => item.id === id) ?? null)
      if (kind === 'question' && courseId) setQuestion((await services.courseQuestions(courseId)).find(item => item.id === id) ?? null)
      if (kind === 'answer' && profile) {
        const item = (await services.questionNotifications(profile.id)).find(entry => entry.id === id)
        if (item) { setNotification(item); if (!item.read) await services.markQuestionNotificationRead(item.id) }
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load this activity.') }
  }, [courseId, id, kind, profile, professorId])
  useEffect(() => { void load() }, [load])

  const removeReview = async () => {
    if (!review) return
    try { await services.deleteReview(review.id); Alert.alert('Review deleted', 'Your review was removed.', [{ text: 'Done', onPress: () => router.back() }]) }
    catch (reason) { Alert.alert('Could not delete review', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  const removeQuestion = async () => {
    Alert.alert('Delete question', 'Question deletion is not available after posting. You can report an issue from the course page.')
  }
  const title = kind === 'courseReview' ? 'Review Details' : kind === 'professorReview' ? 'Review Details' : kind === 'question' ? 'Question Details' : 'Reply Details'

  if (error) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F6F8] px-6 dark:bg-slate-950"><Text className="text-center text-sm text-muted">{error}</Text></SafeAreaView>
  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950"><ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 35 }}>
    <View className="flex-row items-center justify-between pt-2"><Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center"><Feather name="arrow-left" size={22} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable><Text className="text-[16px] font-extrabold text-[#10182F] dark:text-white">{title}</Text><View className="flex-row items-center gap-3"><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#172038'} /><View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></View></View></View>
    {course || teacher ? <Card className="mt-5"><View className="flex-row items-center gap-3"><View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800"><Text className="text-center text-xs font-extrabold text-brand">{course?.code ?? initials(teacher?.name ?? 'Teacher')}</Text></View><View className="flex-1"><Text className="text-sm font-extrabold text-[#172038] dark:text-white">{course?.title ?? teacher?.name}</Text><Text className="mt-1 text-xs text-muted">{course ? `Level ${course.level ?? '—'} · Term ${course.term ?? '—'}` : `${teacher?.designation ?? 'Faculty member'} · ${teacher?.department}`}</Text></View></View></Card> : null}
    {kind === 'courseReview' && review ? <ReviewDetail review={review} onDelete={() => { void removeReview() }} /> : null}
    {kind === 'professorReview' && teacherReview ? <TeacherReviewDetail review={teacherReview} onDelete={() => Alert.alert('Delete review', 'Teacher review deletion is not available from this screen.')} /> : null}
    {kind === 'question' && question ? <QuestionDetail question={question} onDelete={() => { void removeQuestion() }} /> : null}
    {kind === 'answer' && notification ? <ReplyDetail notification={notification} course={course} onOpen={() => notification.courseId && router.push(`/course/${notification.courseId}?section=questions` as never)} /> : null}
    {!review && !teacherReview && !question && !notification ? <Text className="mt-10 text-center text-sm text-muted">This activity is no longer available.</Text> : null}
  </ScrollView></SafeAreaView>
}

function ReviewDetail({ review, onDelete }: { review: Review; onDelete: () => void }) { return <View><Text className="mt-5 text-xs font-bold text-brand">Course Review</Text><Text className="mt-3 text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()} · {review.anonymous ? 'Anonymous' : 'Named'}</Text><Card className="mt-3 bg-slate-50 dark:bg-slate-900"><Text className="text-sm leading-6 text-[#172038] dark:text-slate-200">{review.text}</Text></Card><View className="mt-3 flex-row gap-2">{review.ratings.teachingQuality ? <Tag label="Rated teaching" /> : null}<Tag label={review.anonymous ? 'Anonymous' : 'Named'} /></View><View className="mt-5 flex-row gap-3"><Button className="flex-1" variant="outline" onPress={() => Alert.alert('Edit review', 'Edit this review from the course Reviews tab within the available editing window.')}>Edit</Button><Button className="flex-1" variant="outline" onPress={onDelete}>Delete</Button></View></View> }
function TeacherReviewDetail({ review, onDelete }: { review: ProfessorReview; onDelete: () => void }) { return <View><Text className="mt-5 text-xs font-bold text-rose-600">Teacher Review</Text><Text className="mt-3 text-xs text-muted">{new Date(review.createdAt).toLocaleDateString()} · {review.anonymous ? 'Anonymous' : 'Named'}</Text><Card className="mt-3 bg-slate-50 dark:bg-slate-900"><Text className="text-sm leading-6 text-[#172038] dark:text-slate-200">{review.text}</Text></Card><View className="mt-3 flex-row flex-wrap gap-2">{(review.tags ?? []).map(tag => <Tag key={tag} label={tag} />)}</View><View className="mt-5"><Button variant="outline" onPress={onDelete}>Delete</Button></View></View> }
function QuestionDetail({ question, onDelete }: { question: CourseQuestion; onDelete: () => void }) { return <View><Text className="mt-5 text-xs font-bold text-brand">My Question</Text><Text className="mt-3 text-xs text-muted">{new Date(question.createdAt).toLocaleDateString()} · {question.category}</Text><Card className="mt-3 bg-slate-50 dark:bg-slate-900"><Text className="text-sm leading-6 text-[#172038] dark:text-slate-200">{question.text}</Text></Card>{question.answers?.filter(answer => answer.authorRole === 'teacher').map(answer => <Card key={answer.id} className="mt-3 bg-blue-50 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{answer.authorName}</Text><Text className="mt-1 text-xs text-muted">{new Date(answer.createdAt).toLocaleDateString()}</Text><Text className="mt-2 text-sm leading-5 text-[#52627A] dark:text-slate-300">{answer.text}</Text></Card>)}<View className="mt-5 flex-row gap-3"><Button className="flex-1" variant="outline" onPress={() => Alert.alert('Reply', 'Reply from the course Q&A page.')}>Reply</Button><Button className="flex-1" variant="outline" onPress={onDelete}>Delete</Button></View></View> }
function ReplyDetail({ notification, course, onOpen }: { notification: { title: string; body: string; createdAt: number }; course: Course | null; onOpen: () => void }) { return <View><Text className="mt-5 text-xs font-bold text-brand">Teacher Reply</Text><Text className="mt-3 text-xs text-muted">{new Date(notification.createdAt).toLocaleDateString()}</Text><Card className="mt-3 bg-blue-50 dark:bg-slate-800"><Text className="text-sm font-bold text-[#172038] dark:text-white">{notification.title}</Text><Text className="mt-2 text-sm leading-6 text-[#52627A] dark:text-slate-300">{notification.body}</Text></Card><Button className="mt-5" onPress={onOpen}>View Original Question</Button><Text className="mt-2 text-center text-xs text-muted">{course?.code ?? 'Course question'}</Text></View> }
function Tag({ label }: { label: string }) { return <View className="rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800"><Text className="text-[10px] font-semibold text-muted">{label}</Text></View> }
function initials(name: string) { const parts = name.trim().split(/\s+/); return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() }
function isKind(value: string | undefined): value is DetailKind { return value === 'courseReview' || value === 'professorReview' || value === 'question' || value === 'answer' }
