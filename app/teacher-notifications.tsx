import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text } from 'react-native'
import { Redirect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification } from '@/lib/types'

export default function TeacherNotifications() {
  const { profile } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const load = useCallback(async () => {
    if (!profile) return
    try { setItems(await services.teacherNotifications(profile.id)) } catch (reason) { Alert.alert('Could not load notifications', reason instanceof Error ? reason.message : 'Please try again.') }
  }, [profile])
  useEffect(() => { void load() }, [load])
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Notifications</Text><Text className="mt-1 text-sm text-muted">Questions, feedback, course updates, and announcements.</Text>{items.length ? items.map(item => <Pressable key={item.id} onPress={() => { void services.markTeacherNotificationRead(item.id).then(load).catch(reason => Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.')) }}><Card className={`mt-4 ${item.read ? '' : 'border-brand'}`}><Text className="font-semibold text-ink dark:text-white">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.body}</Text><Text className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</Text></Card></Pressable>) : <Empty title="You're all caught up!" body="No new teacher notifications right now." />}</ScrollView></SafeAreaView>
}
