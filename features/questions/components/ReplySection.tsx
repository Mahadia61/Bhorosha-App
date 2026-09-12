import { Text, View } from 'react-native'
import type { QuestionAnswer } from '@/lib/types/types'

export function ReplySection({ answers = [] }: { answers?: QuestionAnswer[] }) {
  return <View className="gap-3">{answers.map(answer => <View key={answer.id} className="rounded-xl bg-surface p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-ink dark:text-white">{answer.authorName}</Text><Text className="mt-1 text-sm leading-5 text-muted">{answer.text}</Text></View>)}</View>
}
