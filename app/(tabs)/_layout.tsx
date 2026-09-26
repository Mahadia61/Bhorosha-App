import { Stack } from 'expo-router'
import { StudentLayout } from '@/components/layout'

/** Legacy route container retained for deep links while role-specific tab groups are used in the app. */
export default function LegacyLayout() {
  return <StudentLayout><Stack screenOptions={{ headerShown: false }} /></StudentLayout>
}
