import { Alert, Image, Pressable, Text, View } from 'react-native'
import { router, Redirect } from 'expo-router'
import { Button, Card, Screen } from '@/components/ui'
import { TeacherHeader } from '@/components/teacher/TeacherHeader'
import { useApp } from '@/providers/AppProvider'

export default function TeacherProfile() {
  const { profile, signOut } = useApp()
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const logout = async () => {
    try { await signOut(); router.replace('/welcome') } catch (reason) { Alert.alert('Could not sign out', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  return <Screen>
    <View className="px-5 pt-3">
      <TeacherHeader title="Profile" subtitle="Your teaching account and preferences." />
      <Card className="mt-5 items-center">
        <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brandSoft">
          {profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} className="h-20 w-20" /> : <Text className="text-3xl font-bold text-brand">{profile.name.trim().charAt(0).toUpperCase()}</Text>}
        </View>
        <Text className="mt-3 text-xl font-bold text-ink dark:text-white">{profile.name}</Text>
        <Text className="mt-1 text-sm text-muted">{profile.designation ?? 'Teacher'} · Department of {profile.department}</Text>
        <Text className="mt-1 text-sm text-muted">{profile.email}</Text>
      </Card>
      <Pressable onPress={() => router.push('/teacher-settings')} className="mt-4 rounded-2xl border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <Text className="font-semibold text-ink dark:text-white">Settings</Text>
        <Text className="mt-1 text-xs text-muted">Dark mode and password</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/teacher-notifications')} className="mt-3 rounded-2xl border border-line bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <Text className="font-semibold text-ink dark:text-white">Notifications</Text>
        <Text className="mt-1 text-xs text-muted">Questions and course updates</Text>
      </Pressable>
      <Button className="mt-4" variant="danger" onPress={() => { void logout() }}>Sign out</Button>
    </View>
  </Screen>
}
