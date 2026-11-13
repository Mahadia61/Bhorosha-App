import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { AppBottomNav } from '@/components/ui'

export default function TeacherLayout() {
  const segments = useSegments()
  const route = segments[segments.length - 1] ?? ''
  const active = route === 'teacher-questions'
    ? 'questions'
    : route === 'teacher-courses' || route === 'teacher-feedback' || route === 'teacher-insights' || segments.some(segment => String(segment) === 'teacher-course')
      ? 'courses'
      : 'dashboard'

  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }} />
      <AppBottomNav role="teacher" active={active} />
    </View>
  )
}
