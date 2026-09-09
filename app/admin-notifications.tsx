import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification, AppNotificationCategory } from '@/lib/types'

type Filter = 'all' | 'unread' | 'reports' | 'system'
type CategorizedNotification = AppNotification & { category: AppNotificationCategory }

const categoryStyle: Record<AppNotificationCategory, { icon: keyof typeof Feather.glyphMap; iconBg: string; iconColor: string }> = {
  reports: { icon: 'flag', iconBg: '#FFE8EA', iconColor: '#F04455' },
  users: { icon: 'users', iconBg: '#E8F0FE', iconColor: '#0B6BFF' },
  courses: { icon: 'book-open', iconBg: '#EEE8FF', iconColor: '#7540EB' },
  system: { icon: 'bell', iconBg: '#F0F3F7', iconColor: '#64718B' },
}

export default function AdminNotifications() {
  const { profile } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setItems(await services.adminNotifications()); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load notifications.') }
  }, [])
  useEffect(() => { void load() }, [load])
  const categorized = useMemo<CategorizedNotification[]>(() => items.map(item => ({ ...item, category: item.category ?? inferCategory(item.title) })), [items])
  const unread = categorized.filter(item => !item.read)
  const visible = categorized.filter(item => filter === 'all' || filter === 'unread' ? (filter === 'all' || !item.read) : item.category === filter)
  const count = (target: Filter) => target === 'all' ? categorized.length : target === 'unread' ? unread.length : categorized.filter(item => item.category === target).length
  const open = async (item: CategorizedNotification) => {
    try { if (!item.read) { await services.markAdminNotificationRead(item.id); setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read: true } : entry)) }
      if (item.category === 'reports') router.push('/(admin-tabs)/moderation' as never)
      else if (item.category === 'users') router.push('/(admin-tabs)/members' as never)
      else if (item.category === 'courses') router.push('/(admin-tabs)/courses' as never)
    } catch (reason) { Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950" edges={['top']}><ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
    <View className="mb-8 mt-3 flex-row items-start"><Pressable onPress={() => router.back()} className="mr-3 mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"><Feather name="arrow-left" size={22} color="#172038" /></Pressable><View className="flex-1"><Text className="text-[27px] font-extrabold tracking-tight text-[#10182F] dark:text-white">Notifications</Text><Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">Stay updated with important activities.</Text></View><Pressable onPress={() => router.push('/admin-profile' as never)} className="h-11 w-11 items-center justify-center rounded-full bg-[#DCEBFF]"><Text className="text-lg font-bold text-[#0B6BFF]">{profile.name.trim().charAt(0).toUpperCase() || 'A'}</Text></Pressable></View>
    <View className="mb-6 flex-row gap-2"><FilterChip label="All" count={count('all')} active={filter === 'all'} onPress={() => setFilter('all')} /><FilterChip label="Unread" count={count('unread')} active={filter === 'unread'} onPress={() => setFilter('unread')} /><FilterChip label="Reports" count={count('reports')} active={filter === 'reports'} onPress={() => setFilter('reports')} /><FilterChip label="System" count={count('system')} active={filter === 'system'} onPress={() => setFilter('system')} /></View>
    {error ? <View className="items-center rounded-2xl border border-[#E7EAF0] bg-white px-6 py-12"><Feather name="wifi-off" size={26} color="#F04455" /><Text className="mt-3 text-base font-bold text-[#172038]">Notifications unavailable</Text><Text className="mt-2 text-center text-sm text-[#64718B]">{error}</Text><Pressable onPress={() => { void load() }} className="mt-5 rounded-xl bg-[#0B6BFF] px-5 py-3"><Text className="font-bold text-white">Try again</Text></Pressable></View> : visible.length ? <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4">{visible.map((item, index) => <NotificationRow key={item.id} item={item} last={index === visible.length - 1} onPress={() => { void open(item) }} />)}</View> : <View className="items-center pt-20"><View className="mb-6 h-36 w-36 items-center justify-center rounded-full bg-[#EEF1F5]"><Feather name="bell" size={58} color="#71809A" /></View><Text className="text-2xl font-extrabold text-[#172038]">No notifications yet</Text><Text className="mt-2 text-base text-[#64718B]">You're all caught up!</Text></View>}
  </ScrollView><AdminBottomNav /></SafeAreaView>
}

function FilterChip({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className={`flex-1 items-center rounded-2xl px-2 py-3 ${active ? 'bg-[#0B6BFF]' : 'border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900'}`}><Text className={`text-sm font-bold ${active ? 'text-white' : 'text-[#172038] dark:text-white'}`}>{label} ({count})</Text></Pressable> }
function NotificationRow({ item, last, onPress }: { item: CategorizedNotification; last: boolean; onPress: () => void }) { const style = categoryStyle[item.category]; return <Pressable onPress={onPress} className={`flex-row items-start py-5 ${last ? '' : 'border-b border-[#EDF0F5]'}`}><View style={{ backgroundColor: style.iconBg }} className="mr-4 h-16 w-16 items-center justify-center rounded-full"><Feather name={style.icon} size={27} color={style.iconColor} /></View><View className="flex-1 pr-2"><View className="flex-row items-start"><Text className="flex-1 text-base font-extrabold text-[#172038]">{item.title}</Text><Text className="ml-3 text-xs text-[#64718B]">{formatTime(item.createdAt)}</Text></View><Text className="mt-1 text-sm leading-5 text-[#64718B]">{item.body}</Text></View>{!item.read ? <View className="mt-7 h-3 w-3 rounded-full bg-[#0B6BFF]" /> : null}</Pressable> }
function inferCategory(title: string): AppNotificationCategory { const value = title.toLowerCase(); if (value.includes('report') || value.includes('moder')) return 'reports'; if (value.includes('user') || value.includes('teacher') || value.includes('student') || value.includes('verification')) return 'users'; if (value.includes('course')) return 'courses'; return 'system' }
function formatTime(timestamp: number) { const minutes = Math.floor((Date.now() - timestamp) / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes} minutes ago`; if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`; return `${Math.floor(minutes / 1440)} days ago` }
function AdminBottomNav() { const tabs = [{ label: 'Overview', icon: 'grid', href: '/(admin-tabs)/overview' }, { label: 'Courses', icon: 'book-open', href: '/(admin-tabs)/courses' }, { label: 'Members', icon: 'users', href: '/(admin-tabs)/members' }, { label: 'Moderation', icon: 'shield', href: '/(admin-tabs)/moderation' }, { label: 'Analytics', icon: 'bar-chart-2', href: '/(admin-tabs)/analytics' }]; return <View className="flex-row border-t border-[#E7EAF0] bg-white px-2 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} className="flex-1 items-center"><Feather name={tab.icon as keyof typeof Feather.glyphMap} size={21} color="#6C7890" /><Text className="mt-1 text-[10px] font-semibold text-[#6C7890] dark:text-slate-400">{tab.label}</Text></Pressable>)}</View> }
