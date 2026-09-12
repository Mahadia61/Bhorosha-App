import { Pressable, Text, View } from 'react-native'
import type { Professor } from '@/lib/types/types'
import { Card } from '@/components/common'

export function TeacherCard({ teacher, onPress }: { teacher: Professor; onPress?: () => void }) {
  const content = <Card><View className="flex-row items-center gap-3"><View className="h-11 w-11 items-center justify-center rounded-full bg-brandSoft"><Text className="text-lg font-bold text-brand">{teacher.name.charAt(0).toUpperCase()}</Text></View><View className="flex-1"><Text className="font-bold text-ink dark:text-white">{teacher.name}</Text><Text className="mt-1 text-sm text-muted">{teacher.designation ?? teacher.department}</Text></View></View></Card>
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content
}
