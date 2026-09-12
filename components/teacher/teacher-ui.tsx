import { useMemo, useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Stars, colors } from '@/components/ui/ui'
import { services } from '@/lib/services/services'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/utils/academic'
import type { ContentType, Course, CourseGuide, CourseQuestion, Professor, ReportReason, Review } from '@/lib/types/types'
import { ReportButton } from '@/components/moderation/ReportButton'

const reportReasons: ReportReason[] = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Offensive language', 'Other']
const courseTones = [
  { box: 'bg-[#E8F0FF]', text: 'text-brand' },
  { box: 'bg-[#E7F8EE]', text: 'text-emerald-600' },
  { box: 'bg-[#F1E9FF]', text: 'text-violet-600' },
  { box: 'bg-[#FFF4D6]', text: 'text-amber-600' },
] as const

export function courseTone(code: string) {
  const hash = [...code].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return courseTones[hash % courseTones.length]
}

export function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export function formatDate(value: number) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(value: number) {
  if (!value) return ''
  const delta = Date.now() - value
  const minutes = Math.max(1, Math.round(delta / 60000))
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`
  return formatDate(value)
}

export function reviewAverage(review: Review) {
  const ratings = Object.values(review.ratings)
  return ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0
}

export function questionTitle(question: CourseQuestion) {
  const [title] = question.text.split('\n').map(line => line.trim()).filter(Boolean)
  return title || question.text
}

export function questionBody(question: CourseQuestion) {
  const lines = question.text.split('\n').map(line => line.trim()).filter(Boolean)
  return lines.slice(1).join(' ')
}

export function teacherAnswered(question: CourseQuestion) {
  return (question.answers ?? []).some(answer => answer.authorRole === 'teacher')
}

export function promptReport(contentType: ContentType, contentId: string, questionId?: string) {
  const submit = (reason: ReportReason) => {
    Alert.alert('Confirm report', `Report this content for "${reason}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit report', style: 'destructive', onPress: () => {
        void services.reportContent(contentType, contentId, reason, questionId)
          .then(() => Alert.alert('Report submitted', 'An administrator will review this report.'))
          .catch(error => Alert.alert('Could not submit report', error instanceof Error ? error.message : 'Please try again.'))
      } },
    ])
  }
  Alert.alert('Report content', 'Choose a reason for this report.', [...reportReasons.map(reason => ({ text: reason, onPress: () => submit(reason) })), { text: 'Cancel', style: 'cancel' }])
}

export function UnderlineTabs<T extends string>({ items, value, onChange }: { items: { key: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <View className="mt-4 flex-row border-b border-line dark:border-slate-800">
    {items.map(item => {
      const active = item.key === value
      return <Pressable key={item.key} onPress={() => onChange(item.key)} className="flex-1 items-center pb-3">
        <Text className={`text-[13px] font-semibold ${active ? 'text-brand' : 'text-muted'}`}>{item.label}</Text>
        {active ? <View className="absolute bottom-0 h-0.5 w-full bg-brand" /> : null}
      </Pressable>
    })}
  </View>
}

export function SortMenu<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (value: T) => void }) {
  const current = options.find(option => option.key === value)?.label ?? 'Sort'
  return <Pressable onPress={() => {
    Alert.alert('Sort by', undefined, [...options.map(option => ({ text: option.label, onPress: () => onChange(option.key) })), { text: 'Cancel', style: 'cancel' }])
  }} className="flex-row items-center gap-1 rounded-full border border-line bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
    <Text className="text-xs font-semibold text-ink dark:text-white">{current}</Text>
    <Feather name="chevron-down" size={14} color={colors.muted} />
  </Pressable>
}

export function TeacherWelcomeBanner() {
  return <View className="mt-5 overflow-hidden rounded-3xl bg-[#EAF2FF] px-5 py-5 dark:bg-slate-900">
    <View className="flex-row items-center">
      <View className="flex-1 pr-2">
        <Text className="text-[18px] font-extrabold leading-6 text-ink dark:text-white">Inspire. Guide. Make an Impact.</Text>
        <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">Your support helps students learn, grow and build a better future.</Text>
      </View>
      <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white dark:bg-slate-800">
        <Feather name="users" size={28} color={colors.brand} />
        <Text className="mt-1 text-center text-[9px] font-bold leading-3 text-brand">Better Students{'\n'}Brighter Tomorrows</Text>
      </View>
    </View>
  </View>
}

export function TeacherStatCard({ icon, value, label, tone }: { icon: keyof typeof Feather.glyphMap; value: number; label: string; tone: 'blue' | 'orange' | 'green' }) {
  const palette = tone === 'blue' ? { wrap: 'bg-[#E8F0FF]', icon: colors.brand } : tone === 'orange' ? { wrap: 'bg-[#FFF1E4]', icon: '#F59E0B' } : { wrap: 'bg-[#E7F8EE]', icon: '#16A34A' }
  return <View className="min-w-0 flex-1 items-center rounded-2xl border border-line bg-white px-2 py-3 dark:border-slate-800 dark:bg-slate-900">
    <View className={`h-8 w-8 items-center justify-center rounded-xl ${palette.wrap}`}><Feather name={icon} size={16} color={palette.icon} /></View>
    <Text className="mt-2 text-xl font-extrabold text-ink dark:text-white">{value}</Text>
    <Text className="mt-0.5 text-center text-[10px] font-semibold text-muted">{label}</Text>
  </View>
}

export function TeacherCourseCard({ course, onPress, compact = false }: { course: Course; onPress?: () => void; compact?: boolean }) {
  const tone = courseTone(course.code)
  const type = course.courseType ?? 'Theory'
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${course.code}`} onPress={onPress ?? (() => router.push(`/teacher-course/${course.id}` as Href))} className={compact ? 'mr-3 w-36' : 'mb-3'}>
    <Card className={compact ? 'p-3' : ''}>
      <View className="flex-row items-center">
        <View className={`items-center justify-center rounded-2xl ${tone.box} ${compact ? 'h-12 w-12' : 'h-14 w-14'}`}>
          <Text className={`text-center font-extrabold leading-4 ${tone.text} ${compact ? 'text-[10px]' : 'text-xs'}`}>{course.code.replace(' ', '\n')}</Text>
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text numberOfLines={2} className="font-bold text-ink dark:text-white">{course.title}</Text>
          <Text className="mt-1 text-xs text-muted">{academicLabel(course.level, course.term).replace(', ', ' · ')}</Text>
          {compact ? null : <View className="mt-2 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800"><Text className="text-[10px] font-semibold text-muted">{type}</Text></View>}
        </View>
        {compact ? null : <Feather name="chevron-right" size={18} color={colors.muted} />}
      </View>
      {compact ? <View className="mt-2 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800"><Text className="text-[10px] font-semibold text-muted">{type}</Text></View> : null}
    </Card>
  </Pressable>
}

export function TeacherCourseHero({ course }: { course: Course }) {
  const tone = courseTone(course.code)
  return <View className="mt-4 flex-row items-start">
    <View className={`h-16 w-16 items-center justify-center rounded-2xl ${tone.box}`}>
      <Text className={`text-center text-sm font-extrabold leading-4 ${tone.text}`}>{course.code.replace(' ', '\n')}</Text>
    </View>
    <View className="ml-3 flex-1">
      <Text className="text-base font-extrabold text-ink dark:text-white">{course.title}</Text>
      <Text className="mt-1 text-xs text-muted">{academicLabel(course.level, course.term).replace(', ', ' · ')}</Text>
      <Text className="mt-0.5 text-xs text-muted">Department of {course.department}</Text>
      <View className="mt-2 self-start rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800"><Text className="text-[10px] font-semibold text-muted">{course.courseType ?? 'Theory'}</Text></View>
    </View>
  </View>
}

export function TeacherReviewCard({ review, course, liked, onLike }: { review: Review; course?: Course; liked?: boolean; onLike?: () => void }) {
  const name = review.anonymous ? 'Anonymous student' : review.displayName ?? 'Student'
  const rating = reviewAverage(review)
  return <Card className="mt-3">
    <View className="flex-row items-start">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="font-bold text-brand">{initials(name)}</Text></View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-2">
            <Text className="font-bold text-ink dark:text-white">{name}</Text>
            <Text className="mt-0.5 text-xs text-muted">{course?.level ? `Level ${course.level}` : 'Student'} · {formatDate(review.createdAt)}</Text>
          </View>
        </View>
        <View className="mt-1"><Stars value={rating} /></View>
        <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{review.text}</Text>
        {review.responses?.map(response => <View key={response.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{response.teacherName}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{response.text}</Text></View>)}
        <View className="mt-3 flex-row items-center justify-between">
          <Pressable onPress={onLike} className="flex-row items-center gap-1.5"><Feather name="thumbs-up" size={15} color={liked ? colors.brand : colors.muted} /><Text className={`text-xs font-semibold ${liked ? 'text-brand' : 'text-muted'}`}>{liked ? 1 : 0}</Text></Pressable>
          <ReportButton contentType="courseReview" contentId={review.id} />
        </View>
      </View>
    </View>
  </Card>
}

export function TeacherQuestionCard({ question, course, liked, onLike, onAnswered }: { question: CourseQuestion; course?: Course; liked?: boolean; onLike?: () => void; onAnswered?: () => Promise<void> | void }) {
  const { profile } = useApp()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const answers = question.answers ?? []
  const title = questionTitle(question)
  const body = questionBody(question)
  const submit = async () => {
    if (!profile || !draft.trim()) return Alert.alert('Write an answer', 'Enter a response before posting.')
    setSending(true)
    try {
      await services.addQuestionAnswer(question.id, profile, draft)
      setDraft('')
      setOpen(false)
      await onAnswered?.()
    } catch (reason) {
      Alert.alert('Could not post answer', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSending(false)
    }
  }
  return <Card className="mt-3">
    <View className="flex-row items-start">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="font-bold text-brand">S</Text></View>
      <View className="ml-3 flex-1">
        <Text className="font-bold leading-5 text-ink dark:text-white">{title}</Text>
        <Text className="mt-1 text-xs text-muted">Student · {formatDate(question.createdAt)}{course?.level ? ` · Level ${course.level}` : ''}</Text>
        {body ? <Text className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{body}</Text> : null}
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          <Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-slate-800">{question.category}</Text>
          {course?.courseType ? <Text className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-slate-800">{course.courseType}</Text> : null}
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="flex-row items-center gap-1"><Feather name="message-circle" size={14} color={colors.muted} /><Text className="text-xs text-muted">{answers.length} answer{answers.length === 1 ? '' : 's'}</Text></View>
            <Pressable onPress={onLike} className="flex-row items-center gap-1"><Feather name="thumbs-up" size={14} color={liked ? colors.brand : colors.muted} /><Text className={`text-xs ${liked ? 'text-brand' : 'text-muted'}`}>{liked ? 1 : 0}</Text></Pressable>
          </View>
          <View className="flex-row items-center gap-3"><ReportButton contentType="courseQuestion" contentId={question.id} /><Pressable onPress={() => setOpen(current => !current)} className="flex-row items-center gap-1 rounded-lg bg-brand px-3 py-1.5">
            <Feather name="corner-up-left" size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">Answer</Text>
          </Pressable></View>
        </View>
        {answers.map(answer => <View key={answer.id} className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><View className="flex-row items-center justify-between"><Text className="text-xs font-bold text-brand">{answer.authorRole === 'teacher' ? answer.authorName : 'Student'}</Text><ReportButton contentType="answer" contentId={answer.id} questionId={question.id} /></View><Text className="mt-1 text-sm text-ink dark:text-white">{answer.text}</Text></View>)}
        {open ? <View className="mt-3"><TextInput multiline value={draft} onChangeText={setDraft} placeholder="Write an answer in বাংলা or English" placeholderTextColor="#94A3B8" className="min-h-20 rounded-xl border border-line p-3 text-sm text-ink dark:border-slate-700 dark:text-white" /><Button className="mt-2" loading={sending} onPress={() => { void submit() }}>Post answer</Button></View> : null}
      </View>
    </View>
  </Card>
}

export function TeacherAdviceCard({ guide, liked, onLike }: { guide: CourseGuide; liked?: boolean; onLike?: () => void }) {
  const tags = (guide.resources ?? '').split(/[,|]/).map(item => item.trim()).filter(Boolean)
  return <Card className="mt-3">
    <View className="flex-row items-start justify-between">
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="font-bold text-brand">{initials(guide.title)}</Text></View>
        <View className="ml-3">
          <Text className="font-bold text-ink dark:text-white">Senior student</Text>
          <Text className="text-xs text-muted">{guide.createdAt ? new Date(guide.createdAt).getFullYear() : ''}</Text>
        </View>
      </View>
      <View className="items-end gap-1"><Text className="text-xs text-muted">{formatDate(guide.createdAt)}</Text><ReportButton contentType="courseGuide" contentId={guide.id} /></View>
    </View>
    <Text className="mt-3 font-extrabold text-ink dark:text-white">{guide.title}</Text>
    <Text className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{guide.text}</Text>
    {tags.length ? <View className="mt-2 flex-row flex-wrap gap-1.5">{tags.map(tag => <Text key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-slate-800">{tag}</Text>)}</View> : null}
    <View className="mt-3 flex-row items-center justify-between">
      <Pressable onPress={onLike} className="flex-row items-center gap-1.5"><Feather name="thumbs-up" size={15} color={liked ? colors.brand : colors.muted} /><Text className={`text-xs font-semibold ${liked ? 'text-brand' : 'text-muted'}`}>{liked ? 1 : 0}</Text></Pressable>
    </View>
  </Card>
}

export function RatingSummary({ reviews }: { reviews: Review[] }) {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + reviewAverage(review), 0) / reviews.length : 0
  const distribution = useMemo(() => [5, 4, 3, 2, 1].map(stars => ({ stars, count: reviews.filter(review => Math.round(reviewAverage(review)) === stars).length })), [reviews])
  const max = Math.max(1, ...distribution.map(item => item.count))
  return <Card className="mt-4">
    <View className="flex-row items-center">
      <View className="pr-5">
        <Text className="text-xs font-bold text-ink dark:text-white">Course Reviews</Text>
        <Text className="mt-1 text-3xl font-extrabold text-ink dark:text-white">{reviews.length ? average.toFixed(1) : '—'}</Text>
        <Stars value={average} />
        <Text className="mt-1 text-xs text-muted">({reviews.length} review{reviews.length === 1 ? '' : 's'})</Text>
      </View>
      <View className="flex-1">
        {distribution.map(item => <View key={item.stars} className="mt-1 flex-row items-center gap-2">
          <Text className="w-6 text-[10px] text-muted">{item.stars} ★</Text>
          <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><View className="h-full rounded-full bg-brand" style={{ width: `${(item.count / max) * 100}%` }} /></View>
          <Text className="w-6 text-right text-[10px] text-muted">{item.count}</Text>
        </View>)}
      </View>
    </View>
  </Card>
}

export function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return <View className="flex-row items-center py-2.5">
    <View className="w-32 flex-row items-center gap-2"><Feather name={icon} size={16} color={colors.muted} /><Text className="text-xs text-muted">{label}</Text></View>
    <Text className="flex-1 text-sm font-semibold text-ink dark:text-white">{value}</Text>
  </View>
}

export function TeacherRow({ teacher }: { teacher: Pick<Professor, 'id' | 'name' | 'designation'> }) {
  return <View className="flex-row items-center py-3">
    <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="font-bold text-brand">{initials(teacher.name)}</Text></View>
    <View className="ml-3 flex-1">
      <Text className="font-semibold text-ink dark:text-white">{teacher.name}</Text>
      <Text className="text-xs text-muted">{teacher.designation ?? 'Course teacher'}</Text>
    </View>
    <Feather name="chevron-right" size={16} color={colors.muted} />
  </View>
}

export type TeacherActivity = { id: string; title: string; subtitle: string; createdAt: number; tone: 'question' | 'review' | 'answer' | 'teacherReview'; href: Href }

export function ActivityRow({ item }: { item: TeacherActivity }) {
  const palette = item.tone === 'question' ? { wrap: 'bg-[#F3E8FF]', icon: 'help-circle' as const, color: '#7C3AED' }
    : item.tone === 'review' ? { wrap: 'bg-[#E7F8EE]', icon: 'message-circle' as const, color: '#16A34A' }
    : item.tone === 'answer' ? { wrap: 'bg-[#E8F0FF]', icon: 'corner-up-left' as const, color: colors.brand }
    : { wrap: 'bg-[#FFE8EE]', icon: 'star' as const, color: '#E11D48' }
  return <Pressable onPress={() => router.push(item.href)} className="flex-row items-center py-3">
    <View className={`h-10 w-10 items-center justify-center rounded-full ${palette.wrap}`}><Feather name={palette.icon} size={16} color={palette.color} /></View>
    <View className="ml-3 flex-1">
      <Text className="font-semibold text-ink dark:text-white">{item.title}</Text>
      <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">{item.subtitle}</Text>
    </View>
    <Text className="mr-1 text-[10px] text-muted">{timeAgo(item.createdAt)}</Text>
    <Feather name="chevron-right" size={16} color={colors.muted} />
  </Pressable>
}
