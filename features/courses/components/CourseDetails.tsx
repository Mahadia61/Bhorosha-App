import { Text, View } from 'react-native'
import type { Course } from '@/lib/types/types'
import { Card } from '@/components/ui/ui'

export function CourseDetails({ course }: { course: Course }) {
  return <Card>
    <Text className="text-xs font-bold text-brand">{course.code}</Text>
    <Text className="mt-1 text-xl font-extrabold text-ink dark:text-white">{course.title}</Text>
    <View className="mt-3 flex-row flex-wrap gap-3">
      <Text className="text-sm text-muted">{course.credits} credits</Text>
      <Text className="text-sm text-muted">{course.department}</Text>
      {course.courseType ? <Text className="text-sm text-muted">{course.courseType}</Text> : null}
    </View>
  </Card>
}
