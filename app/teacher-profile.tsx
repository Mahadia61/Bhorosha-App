import { Alert, Image, Pressable, Text, View } from 'react-native'
import { router, Redirect } from 'expo-router'
import { Screen, Card } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function TeacherProfile() {
  const { profile, signOut } = useApp()
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const logout = async () => {
    try { await signOut(); router.replace('/welcome') } catch (reason) { Alert.alert('Could not sign out', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  return <Screen><View className="px-5 pt-6"><Text className="text-2xl font-bold text-ink dark:text-white">Profile</Text><Card className="mt-5 items-center"><View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand">{profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} className="h-20 w-20" /> : <Text className="text-3xl font-bold text-white">{profile.name.trim().charAt(0).toUpperCase()}</Text>}</View><Text className="mt-3 text-xl font-bold text-ink dark:text-white">{profile.name}</Text><Text className="mt-1 text-sm text-muted">{profile.email}</Text><Text className="mt-1 text-xs font-bold uppercase text-brand">{profile.designation ?? 'Teacher'}</Text></Card><Pressable onPress={() => router.push('/teacher-settings')} className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><Text className="font-semibold text-ink dark:text-white">Settings</Text><Text className="mt-1 text-xs text-muted">Dark mode and password</Text></Pressable><Pressable onPress={() => { void logout() }} className="mt-3 rounded-xl border border-rose-200 p-4"><Text className="font-semibold text-rose-600">Logout</Text></Pressable></View></Screen>
}
