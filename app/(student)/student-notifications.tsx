import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Empty, FilterChips, PageHeader, Screen } from '@/components/ui/ui'
import { notificationService } from '@/features/notifications'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification } from '@/types'

type Filter = 'all' | 'unread' | 'replies' | 'courses'

export default function StudentNotifications() {
  const { profile } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try { setItems((await Promise.all([notificationService.questionNotifications(profile.id), notificationService.userNotifications(profile.id)])).flat().sort((left, right) => right.createdAt - left.createdAt)); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load notifications.') }
  }, [profile])
  useEffect(() => { void load() }, [load])

  const visible = useMemo(() => items.filter(item => {
    const value = `${item.title} ${item.body}`.toLowerCase()
    const courseUpdate = value.includes('course') || value.includes('announcement')
    return filter === 'all' || (filter === 'unread' && !item.read) || (filter === 'courses' && courseUpdate) || (filter === 'replies' && !courseUpdate)
  }), [items, filter])
  const count = (target: Filter) => target === 'all' ? items.length : target === 'unread' ? items.filter(item => !item.read).length : target === 'courses' ? items.filter(item => `${item.title} ${item.body}`.toLowerCase().includes('course')).length : items.filter(item => item.title.toLowerCase().includes('reply') || item.title.toLowerCase().includes('response')).length
  const open = async (item: AppNotification) => {
    try {
      if (!item.read) { if (item.reportId) await notificationService.markUserNotificationRead(item.id); else await notificationService.markQuestionNotificationRead(item.id); setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read: true } : entry)) }
      if (item.courseId) router.push(`/course/${item.courseId}?section=questions` as never)
    } catch (reason) { Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  if (profile?.role !== 'student') return <Redirect href="/" />

  return <Screen><ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
    <View className="mb-5 mt-3"><PageHeader title="Notifications" subtitle="Stay updated with teacher replies and course activities." onBack={() => router.back()} /></View>
    <View className="mb-6"><FilterChips items={([{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'replies', label: 'Replies' }, { key: 'courses', label: 'Courses' }] as const).map(item => ({ ...item, count: count(item.key) }))} value={filter} onChange={setFilter} /></View>
    {error ? <View className="items-center rounded-2xl border border-[#E7EAF0] bg-white px-6 py-12 dark:border-slate-800 dark:bg-slate-900"><Feather name="wifi-off" size={26} color="#F04455" /><Text className="mt-3 text-base font-bold text-[#172038] dark:text-white">Notifications unavailable</Text><Text className="mt-2 text-center text-sm text-[#64718B]">{error}</Text><Pressable onPress={() => { void load() }} className="mt-5 rounded-xl bg-[#0B6BFF] px-5 py-3"><Text className="font-bold text-white">Try again</Text></Pressable></View> : visible.length ? <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">{visible.map((item, index) => <NotificationRow key={item.id} item={item} last={index === visible.length - 1} onPress={() => { void open(item) }} />)}</View> : <View className="items-center pt-20"><View className="mb-6 h-36 w-36 items-center justify-center rounded-full bg-[#EEF1F5] dark:bg-slate-900"><Feather name="bell" size={58} color="#71809A" /></View><Text className="text-2xl font-extrabold text-[#172038] dark:text-white">No notifications yet</Text><Text className="mt-2 text-base text-[#64718B] dark:text-slate-400">You're all caught up!</Text></View>}
  </ScrollView></Screen>
}

function NotificationRow({ item, last, onPress }: { item: AppNotification; last: boolean; onPress: () => void }) { const course = `${item.title} ${item.body}`.toLowerCase().includes('course'); return <Pressable onPress={onPress} className={`flex-row items-start py-5 ${last ? '' : 'border-b border-[#EDF0F5] dark:border-slate-800'}`}><View className={`mr-4 h-14 w-14 items-center justify-center rounded-full ${course ? 'bg-[#EEE8FF]' : 'bg-[#E8F0FE]'}`}><Feather name={course ? 'book-open' : 'message-circle'} size={24} color={course ? '#7540EB' : '#0B6BFF'} /></View><View className="flex-1 pr-2"><View className="flex-row items-start"><Text className="flex-1 text-sm font-extrabold text-[#172038] dark:text-white">{item.title}</Text><Text className="ml-2 text-[10px] text-[#64718B]">{formatTime(item.createdAt)}</Text></View><Text className="mt-1 text-xs leading-5 text-[#64718B] dark:text-slate-400">{item.body}</Text></View>{!item.read ? <View className="mt-6 h-2.5 w-2.5 rounded-full bg-[#0B6BFF]" /> : null}</Pressable> }
function formatTime(timestamp: number) { const minutes = Math.floor((Date.now() - timestamp) / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`; return `${Math.floor(minutes / 1440)}d ago` }
