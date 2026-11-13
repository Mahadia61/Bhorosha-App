import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Card, Empty, FilterChips, PageHeader, Screen } from '@/components/ui/ui'
import { notificationService } from '@/features/notifications'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification } from '@/types'

type Filter = 'all' | 'unread'

export default function TeacherNotifications() {
  const { profile } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const load = useCallback(async () => {
    if (!profile) return
    try { setItems(await notificationService.teacherNotifications(profile.id)) } catch (reason) { Alert.alert('Could not load notifications', reason instanceof Error ? reason.message : 'Please try again.') }
  }, [profile])
  useEffect(() => {
    if (!profile || profile.role !== 'teacher') return
    return notificationService.subscribeTeacherNotifications(profile.id, setItems, reason => Alert.alert('Could not watch notifications', reason.message))
  }, [profile])
  const visible = useMemo(() => items.filter(item => filter === 'all' || !item.read), [items, filter])
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  return <Screen>
    <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="mt-3"><PageHeader title="Notifications" subtitle="Questions, feedback, course updates, and announcements." onBack={() => router.back()} /></View>
      <View className="mt-5"><FilterChips items={[{ key: 'all', label: 'All', count: items.length }, { key: 'unread', label: 'Unread', count: items.filter(item => !item.read).length }]} value={filter} onChange={setFilter} /></View>
      {visible.length ? visible.map(item => <Pressable key={item.id} onPress={() => { void notificationService.markTeacherNotificationRead(item.id).then(load).catch(reason => Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.')) }}><Card className={`mt-4 ${item.read ? '' : 'border-brand'}`}><Text className="font-semibold text-ink dark:text-white">{item.title}</Text><Text className="mt-1 text-sm text-muted">{item.body}</Text><Text className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</Text></Card></Pressable>) : <Empty title="You're all caught up!" body="No new teacher notifications right now." />}
    </ScrollView>
  </Screen>
}
