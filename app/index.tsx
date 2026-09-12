import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useApp } from '@/providers/AppProvider'
export default function Index() {
  const { ready, profile } = useApp()
  if (!ready) return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
  if (!profile) return <Redirect href="/welcome" />
  if (profile.role === 'admin') return <Redirect href="/(admin-tabs)/overview" />
  if (profile.role === 'teacher') return <Redirect href="/(teacher-tabs)/dashboard" />
  if (profile.emailVerified) return <Redirect href="/(student-tabs)/home" />
  return <Redirect href="/verify-email" />
}
