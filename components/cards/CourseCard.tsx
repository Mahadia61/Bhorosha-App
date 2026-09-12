import { Pressable, Text, View } from 'react-native'
import type { Course } from '@/lib/types/types'
import { Card } from '@/components/ui/ui'

export function CourseCard({ course, onPress }: { course: Course; onPress?: () => void }) {
  const content = <Card>
    <Text className="text-xs font-bold text-brand">{course.code}</Text>
    <Text className="mt-1 text-base font-bold text-ink dark:text-white">{course.title}</Text>
    <View className="mt-2 flex-row gap-3"><Text className="text-xs text-muted">{course.credits} credits</Text><Text className="text-xs text-muted">{course.department}</Text></View>
  </Card>
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content
}
