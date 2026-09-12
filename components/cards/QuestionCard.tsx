import { Pressable, Text } from 'react-native'
import type { CourseQuestion } from '@/lib/types/types'
import { Card } from '@/components/ui/ui'
export function QuestionCard({ question, onPress }: { question: CourseQuestion; onPress?: () => void }) {
  const content = <Card><Text className="text-xs font-semibold text-brand">{question.category}</Text><Text className="mt-2 text-sm leading-5 text-ink dark:text-white">{question.text}</Text><Text className="mt-2 text-xs text-muted">{question.answers?.length ?? 0} answers</Text></Card>
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content
}
