import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { Course, Professor, QuestionCategory } from '@/lib/types'

type FormMode = 'review' | 'question'
type Visibility = 'anonymous' | 'named'
type QuestionFormCategory = 'Course Related' | 'Academic' | 'Project' | 'Advising' | 'Other'

const aspects = ['Teaching Quality', 'Communication', 'Availability', 'Supportiveness', 'Fairness']
const reviewTags = ['Clear explanation', 'Supportive', 'Well organized', 'Approachable', 'Helpful', 'Fair', 'Other']
const questionCategories: QuestionFormCategory[] = ['Course Related', 'Academic', 'Project', 'Advising', 'Other']

export function TeacherFormScreen({ mode }: { mode: FormMode }) {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { profile, isDark } = useApp()
  const [teacher, setTeacher] = useState<Professor | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [visibility, setVisibility] = useState<Visibility>('anonymous')
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [category, setCategory] = useState<QuestionFormCategory>('Course Related')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) {
      setError('A teacher was not selected.')
      setLoading(false)
      return
    }
    try {
      const [people, allCourses] = await Promise.all([services.professors(), services.courses()])
      const nextTeacher = people.find(person => person.id === id)
      if (!nextTeacher) throw new Error('This teacher profile is no longer available.')
      setTeacher(nextTeacher)
      setCourses(allCourses.filter(course => course.teacherIds.includes(id) || course.teacherNames.includes(nextTeacher.name)))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this teacher.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const course = courses[0]
  const titleLabel = mode === 'review' ? 'Write a Review' : 'Ask a Question'
  const submitLabel = mode === 'review' ? 'Submit Review' : 'Post Question'
  const canSubmit = mode === 'review' ? text.trim().length > 0 : title.trim().length > 0 && text.trim().length > 0

  const toggleTag = (tag: string) => setSelectedTags(current => current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
  const setAspect = (aspect: string, value: number) => setAspectRatings(current => ({ ...current, [aspect]: value }))

  const submit = async () => {
    if (!canSubmit || !teacher) return Alert.alert(mode === 'review' ? 'Write a review' : 'Complete your question', mode === 'review' ? 'Share your experience before submitting.' : 'Add both a title and question description.')
    if (mode === 'question' && !course) return Alert.alert('No course available', 'This teacher has no assigned course yet.')
    setSubmitting(true)
    try {
      if (mode === 'review') {
        const values = Object.values(aspectRatings)
        const rating = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
        await services.addProfessorReview({ professorId: teacher.id, text: text.trim(), rating, aspects: aspectRatings, tags: selectedTags, anonymous: visibility === 'anonymous' })
      } else {
        const questionCategory: QuestionCategory = category
        const attachmentText = attachment ? `\n\nAttachment: ${attachment}` : ''
        await services.addCourseQuestion({ courseId: course!.id, category: questionCategory, text: `${title.trim()}\n\n${text.trim()}${attachmentText}`, anonymous: visibility === 'anonymous' })
      }
      Alert.alert(mode === 'review' ? 'Review submitted' : 'Question posted', mode === 'review' ? 'Thank you for sharing your feedback.' : 'Your teacher can now respond.', [{ text: 'Done', onPress: () => router.back() }])
    } catch (reason) {
      Alert.alert(`Could not ${mode === 'review' ? 'submit review' : 'post question'}`, reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F6F8] dark:bg-slate-950"><Text className="text-sm text-muted">Loading teacher…</Text></SafeAreaView>
  if (error || !teacher) return <SafeAreaView className="flex-1 items-center justify-center bg-[#F5F6F8] px-6 dark:bg-slate-950"><Text className="text-center text-sm text-muted">{error || 'Teacher not found.'}</Text></SafeAreaView>

  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
      <View className="flex-row items-center justify-between pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center"><Feather name="arrow-left" size={22} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable>
        <Text className="text-[17px] font-extrabold text-[#10182F] dark:text-white">{titleLabel}</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.push('/student-notifications' as never)} className="relative"><Feather name="bell" size={20} color={isDark ? '#E2E8F0' : '#111318'} /><View className="absolute -right-2 -top-2 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1"><Text className="text-[9px] font-bold text-white">3</Text></View></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/profile' as never)} className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">{profile?.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable>
        </View>
      </View>

      <Card className="mt-4 p-4">
        <View className="flex-row items-center gap-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"><Text className="text-2xl font-extrabold text-brand">{initials(teacher.name)}</Text></View>
          <View className="flex-1"><Text className="text-sm font-extrabold text-[#172038] dark:text-white">{teacher.name}</Text><Text className="mt-1 text-xs text-[#52627A] dark:text-slate-300">{teacher.designation || 'Faculty member'}</Text><Text className="mt-1 text-xs text-[#64718B] dark:text-slate-400">Department of {teacher.department}</Text></View>
        </View>
        <View className="mt-3 flex-row items-center gap-2"><Feather name="book-open" size={14} color="#52627A" /><Text className="flex-1 text-xs text-[#52627A] dark:text-slate-300">Courses: {courses.length ? courses.map(item => item.code).join(' | ') : 'No courses assigned'}</Text></View>
      </Card>

      <SectionTitle title={mode === 'review' ? 'Review Visibility' : 'Question Visibility'} info />
      <View className="flex-row gap-3">
        <VisibilityCard selected={visibility === 'anonymous'} title="Anonymous" description="Your name will not be shown to other students." onPress={() => setVisibility('anonymous')} />
        <VisibilityCard selected={visibility === 'named'} title="Named" description="Your name and department will be shown." onPress={() => setVisibility('named')} />
      </View>

      {mode === 'review' ? <ReviewFields aspectRatings={aspectRatings} setAspect={setAspect} selectedTags={selectedTags} toggleTag={toggleTag} text={text} setText={setText} /> : <QuestionFields category={category} setCategory={setCategory} title={title} setTitle={setTitle} text={text} setText={setText} attachment={attachment} setAttachment={setAttachment} />}
    </ScrollView>
    <View className="absolute bottom-0 left-0 right-0 border-t border-[#E7EAF0] bg-[#F5F6F8] px-4 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-950"><Button onPress={() => { void submit() }} loading={submitting} disabled={!canSubmit}>{submitLabel}</Button></View>
  </SafeAreaView>
}

function ReviewFields({ aspectRatings, setAspect, selectedTags, toggleTag, text, setText }: { aspectRatings: Record<string, number>; setAspect: (aspect: string, value: number) => void; selectedTags: string[]; toggleTag: (tag: string) => void; text: string; setText: (value: string) => void }) {
  return <><SectionTitle title="Rate Teaching Aspects" suffix="Optional" /><View className="rounded-2xl border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-900">{aspects.map(aspect => <View key={aspect} className="flex-row items-center justify-between py-2"><Text className="text-xs text-[#172038] dark:text-white">{aspect}</Text><StarPicker value={aspectRatings[aspect] ?? 0} onChange={value => setAspect(aspect, value)} /></View>)}</View><SectionTitle title="Your Review" /><TextInput multiline value={text} onChangeText={setText} maxLength={1000} placeholder="Share your experience with this teacher. What did you like? What could be improved?" placeholderTextColor="#64718B" textAlignVertical="top" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-5 text-[#172038] dark:border-slate-800 dark:bg-slate-900 dark:text-white" /><Text className="mt-1 text-right text-[10px] text-muted">{text.length}/1000</Text><SectionTitle title="Tags" suffix="Optional" /><View className="flex-row flex-wrap gap-2">{reviewTags.map(tag => <Pressable key={tag} onPress={() => toggleTag(tag)} className={`rounded-lg px-3 py-2 ${selectedTags.includes(tag) ? 'bg-blue-100' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-[11px] font-semibold ${selectedTags.includes(tag) ? 'text-brand' : 'text-muted'}`}>{tag}</Text></Pressable>)}</View></>
}

function QuestionFields({ category, setCategory, title, setTitle, text, setText, attachment, setAttachment }: { category: QuestionFormCategory; setCategory: (value: QuestionFormCategory) => void; title: string; setTitle: (value: string) => void; text: string; setText: (value: string) => void; attachment: string; setAttachment: (value: string) => void }) {
  return <><SectionTitle title="Question Category" /><View className="flex-row flex-wrap gap-2">{questionCategories.map(item => <Pressable key={item} onPress={() => setCategory(item)} className={`rounded-lg px-4 py-2.5 ${category === item ? 'bg-brand' : 'bg-slate-100 dark:bg-slate-800'}`}><Text className={`text-xs font-semibold ${category === item ? 'text-white' : 'text-[#172038] dark:text-slate-200'}`}>{item}</Text></Pressable>)}</View><SectionTitle title="Question Title" /><TextInput value={title} onChangeText={setTitle} maxLength={100} placeholder="Enter a short, specific title for your question..." placeholderTextColor="#64718B" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-[#172038] dark:border-slate-800 dark:bg-slate-900 dark:text-white" /><Text className="mt-1 text-right text-[10px] text-muted">{title.length}/100</Text><SectionTitle title="Your Question" /><TextInput multiline value={text} onChangeText={setText} maxLength={1000} placeholder="Type your question clearly so that your teacher can understand easily." placeholderTextColor="#64718B" textAlignVertical="top" className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-5 text-[#172038] dark:border-slate-800 dark:bg-slate-900 dark:text-white" /><Text className="mt-1 text-right text-[10px] text-muted">{text.length}/1000</Text><SectionTitle title="Attachment" suffix="Optional" /><Pressable onPress={() => setAttachment(attachment ? '' : 'Attachment selected')} className="flex-row items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-4 dark:border-slate-800 dark:bg-slate-900"><Feather name="paperclip" size={17} color="#52627A" /><Text className="text-xs text-[#52627A] dark:text-slate-300">{attachment || 'Add file (PDF, image, or code file)'}</Text></Pressable><Text className="mt-1 text-xs text-muted">Max file size: 10 MB</Text></>
}

function SectionTitle({ title, suffix, info }: { title: string; suffix?: string; info?: boolean }) { return <View className="mb-2 mt-5 flex-row items-center gap-1"><Text className="text-xs font-extrabold text-[#172038] dark:text-white">{title}</Text>{suffix ? <Text className="text-xs font-normal text-muted">({suffix})</Text> : null}{info ? <Feather name="info" size={13} color="#64718B" /> : null}</View> }
function VisibilityCard({ selected, title, description, onPress }: { selected: boolean; title: string; description: string; onPress: () => void }) { return <Pressable onPress={onPress} className={`flex-1 rounded-xl border px-3 py-3 ${selected ? 'border-brand bg-blue-50 dark:bg-slate-800' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}><View className="flex-row items-center gap-2"><View className={`h-4 w-4 items-center justify-center rounded-full border ${selected ? 'border-brand bg-brand' : 'border-slate-400'}`}>{selected ? <Feather name="check" size={10} color="white" /> : null}</View><Text className="text-xs font-bold text-[#172038] dark:text-white">{title}</Text></View><Text className="mt-1 pl-6 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">{description}</Text></Pressable> }
function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) { return <View className="flex-row gap-2">{[1, 2, 3, 4, 5].map(item => <Pressable key={item} onPress={() => onChange(item)}><Feather name="star" size={19} color={item <= value ? '#F59E0B' : '#CBD5E1'} /></Pressable>)}</View> }
function initials(name: string) { const parts = name.trim().split(/\s+/); return `${parts[0]?.charAt(0) ?? 'T'}${parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''}`.toUpperCase() }
