import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification } from '@/lib/types'

type Filter = 'all' | 'unread' | 'replies' | 'courses'

export default function StudentNotifications() {
  const { profile, isDark } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile) return
    try { setItems(await services.questionNotifications(profile.id)); setError('') }
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
      if (!item.read) { await services.markQuestionNotificationRead(item.id); setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read: true } : entry)) }
      if (item.courseId) router.push(`/course/${item.courseId}?section=questions` as never)
    } catch (reason) { Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  if (profile?.role !== 'student') return <Redirect href="/" />

  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950" edges={['top']}><View className="flex-1"><ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
    <View className="mb-7 mt-3 flex-row items-start"><Pressable onPress={() => router.back()} className="mr-3 mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"><Feather name="arrow-left" size={22} color={isDark ? '#E2E8F0' : '#172038'} /></Pressable><View className="flex-1"><Text className="text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">Notifications</Text><Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">Stay updated with teacher replies and course activities.</Text></View><Pressable onPress={() => router.push('/(student-tabs)/profile' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-[#DCEBFF]"><Text className="text-lg font-bold text-[#0B6BFF]">{profile.name.trim().charAt(0).toUpperCase() || 'S'}</Text></Pressable></View>
    <View className="mb-6 flex-row gap-2">{(['all', 'unread', 'replies', 'courses'] as Filter[]).map(item => <FilterChip key={item} label={item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)} count={count(item)} active={filter === item} onPress={() => setFilter(item)} />)}</View>
    {error ? <View className="items-center rounded-2xl border border-[#E7EAF0] bg-white px-6 py-12 dark:border-slate-800 dark:bg-slate-900"><Feather name="wifi-off" size={26} color="#F04455" /><Text className="mt-3 text-base font-bold text-[#172038] dark:text-white">Notifications unavailable</Text><Text className="mt-2 text-center text-sm text-[#64718B]">{error}</Text><Pressable onPress={() => { void load() }} className="mt-5 rounded-xl bg-[#0B6BFF] px-5 py-3"><Text className="font-bold text-white">Try again</Text></Pressable></View> : visible.length ? <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">{visible.map((item, index) => <NotificationRow key={item.id} item={item} last={index === visible.length - 1} onPress={() => { void open(item) }} />)}</View> : <View className="items-center pt-20"><View className="mb-6 h-36 w-36 items-center justify-center rounded-full bg-[#EEF1F5] dark:bg-slate-900"><Feather name="bell" size={58} color="#71809A" /></View><Text className="text-2xl font-extrabold text-[#172038] dark:text-white">No notifications yet</Text><Text className="mt-2 text-base text-[#64718B] dark:text-slate-400">You're all caught up!</Text></View>}
  </ScrollView><StudentBottomNav /></View></SafeAreaView>
}

function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className={`flex-1 items-center rounded-2xl px-1 py-3 ${active ? 'bg-[#0B6BFF]' : 'border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900'}`}><Text className={`text-[11px] font-bold ${active ? 'text-white' : 'text-[#172038] dark:text-white'}`}>{label} ({count})</Text></Pressable> }
function NotificationRow({ item, last, onPress }: { item: AppNotification; last: boolean; onPress: () => void }) { const course = `${item.title} ${item.body}`.toLowerCase().includes('course'); return <Pressable onPress={onPress} className={`flex-row items-start py-5 ${last ? '' : 'border-b border-[#EDF0F5] dark:border-slate-800'}`}><View className={`mr-4 h-14 w-14 items-center justify-center rounded-full ${course ? 'bg-[#EEE8FF]' : 'bg-[#E8F0FE]'}`}><Feather name={course ? 'book-open' : 'message-circle'} size={24} color={course ? '#7540EB' : '#0B6BFF'} /></View><View className="flex-1 pr-2"><View className="flex-row items-start"><Text className="flex-1 text-sm font-extrabold text-[#172038] dark:text-white">{item.title}</Text><Text className="ml-2 text-[10px] text-[#64718B]">{formatTime(item.createdAt)}</Text></View><Text className="mt-1 text-xs leading-5 text-[#64718B] dark:text-slate-400">{item.body}</Text></View>{!item.read ? <View className="mt-6 h-2.5 w-2.5 rounded-full bg-[#0B6BFF]" /> : null}</Pressable> }
function formatTime(timestamp: number) { const minutes = Math.floor((Date.now() - timestamp) / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`; return `${Math.floor(minutes / 1440)}d ago` }
function StudentBottomNav() {
  const tabs = [{ label: 'Home', icon: 'home', href: '/(student-tabs)/home' }, { label: 'Courses', icon: 'book-open', href: '/(student-tabs)/courses' }, { label: 'Teachers', icon: 'users', href: '/(student-tabs)/professors' }, { label: 'Activity', icon: 'clock', href: '/(student-tabs)/activity' }] as const
  return <View className="absolute bottom-0 left-0 right-0 flex-row border-t border-[#E7EAF0] bg-white px-1 pb-4 pt-3 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} className="flex-1 items-center"><Feather name={tab.icon} size={22} color="#7A879A" /><Text className="mt-1 text-[10px] font-semibold text-[#7A879A]">{tab.label}</Text></Pressable>)}</View>
}
