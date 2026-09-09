import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'

export function TeacherHeader({ title }: { title: string }) {
  const { profile } = useApp()
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!profile) return
    const unsubscribe = services.subscribeTeacherNotifications(profile.id, items => setUnread(items.filter(item => !item.read).length), () => setUnread(0))
    return unsubscribe
  }, [profile?.id, profile?.teacherProfileId])
  return <><View className="flex-row items-center justify-between"><Text className="text-sm text-muted">{title}</Text><View className="flex-row items-center gap-3"><Pressable accessibilityRole="button" accessibilityLabel="Open teacher notifications" onPress={() => router.push('/teacher-notifications')} className="relative h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Feather name="bell" size={19} color="white" />{unread ? <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-rose-500 px-1.5 py-0.5"><Text className="text-[10px] font-bold text-white">{unread > 99 ? '99+' : unread}</Text></View> : null}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Open teacher profile" onPress={() => router.push('/teacher-profile')} className="h-11 w-11 items-center justify-center rounded-full border border-blue-300 bg-blue-500"><Text className="text-base font-bold text-white">{profile?.name.trim().charAt(0).toUpperCase() || 'U'}</Text></Pressable></View></View>
  {profile?.teacherLinkPending ? <Pressable accessibilityRole="button" onPress={() => router.push('/verify-email')} className="my-3 rounded-xl bg-amber-50 p-3 dark:bg-slate-800"><Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">Verify your email to link your teacher profile and access assigned courses</Text></Pressable> : null}</>
}
