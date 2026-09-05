import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Button, Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { AppNotification, AppNotificationCategory } from '@/lib/types'

type Filter = 'all' | 'unread' | AppNotificationCategory
type NormalizedNotification = AppNotification & { category: AppNotificationCategory }

const categoryMeta: Record<AppNotificationCategory, { label: string; color: string; icon: keyof typeof Feather.glyphMap }> = {
  reports: { label: 'Reports', color: 'text-rose-600', icon: 'alert-circle' },
  users: { label: 'Users', color: 'text-blue-600', icon: 'users' },
  courses: { label: 'Courses', color: 'text-emerald-600', icon: 'book-open' },
  system: { label: 'System', color: 'text-slate-500', icon: 'info' },
}

export default function AdminNotifications() {
  const { profile } = useApp()
  const [items, setItems] = useState<AppNotification[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<NormalizedNotification | null>(null)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const stored = await services.adminNotifications()
      setItems(stored)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load notifications.')
    }
  }, [])
  useEffect(() => { void load() }, [load])
  const categorized = useMemo<NormalizedNotification[]>(() => items.map(item => ({ ...item, category: item.category ?? inferCategory(item.title) })), [items])
  const unreadCount = categorized.filter(item => !item.read).length
  const visibleItems = categorized.filter(item => filter === 'all' || (filter === 'unread' ? !item.read : item.category === filter))
  const markRead = async (item: AppNotification) => {
    if (item.read) return
    try {
      await services.markAdminNotificationRead(item.id)
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, read: true } : entry))
    } catch (reason) {
      Alert.alert('Could not update notification', reason instanceof Error ? reason.message : 'Please try again.')
    }
  }
  const openAction = (item: AppNotification) => {
    void markRead(item)
    setSelected(null)
    if (item.category === 'reports') router.push('/(admin-tabs)/moderation')
    else if (item.category === 'users') router.push('/(admin-tabs)/members')
    else if (item.category === 'courses') router.push('/(admin-tabs)/courses')
  }
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
    <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
      <View className="mt-6 flex-row items-start justify-between">
        <View><Text className="text-2xl font-bold text-ink dark:text-white">Notifications</Text><Text className="mt-1 text-sm text-muted">Stay updated with important platform activities.</Text></View>
        {unreadCount ? <View className="mt-1 rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-950"><Text className="text-xs font-semibold text-brand">{unreadCount} unread</Text></View> : null}
      </View>
      <View className="mt-5 flex-row flex-wrap gap-2">{(['all', 'unread', 'reports', 'users', 'courses', 'system'] as const).map(option => <FilterButton key={option} label={option === 'all' ? 'All' : option === 'unread' ? 'Unread' : categoryMeta[option].label} count={option === 'all' ? categorized.length : option === 'unread' ? unreadCount : categorized.filter(item => item.category === option).length} active={filter === option} onPress={() => setFilter(option)} />)}</View>
      {error ? <><Empty title="Notifications unavailable" body={error} /><Button variant="outline" onPress={() => { void load() }}>Try again</Button></> : visibleItems.length ? <>{visibleItems.map(item => <NotificationCard key={item.id} item={item} onOpen={() => setSelected(item)} onAction={() => openAction(item)} />)}<Pressable onPress={() => { void Promise.all(categorized.filter(item => !item.read).map(item => services.markAdminNotificationRead(item.id))).then(load).catch(reason => Alert.alert('Could not mark notifications', reason instanceof Error ? reason.message : 'Please try again.')) }} className="mt-5 items-center"><Text className="text-sm font-semibold text-brand">Mark all as read</Text></Pressable></> : <Empty title="You're all caught up!" body="No pending actions right now." /> }
    </ScrollView>
    <NotificationDetail item={selected} onClose={() => setSelected(null)} onAction={openAction} />
  </SafeAreaView>
}

function inferCategory(title: string): AppNotificationCategory { const normalized = title.toLowerCase(); if (normalized.includes('report') || normalized.includes('moder')) return 'reports'; if (normalized.includes('user') || normalized.includes('teacher') || normalized.includes('student') || normalized.includes('verification')) return 'users'; if (normalized.includes('course')) return 'courses'; return 'system' }
function FilterButton({ label, count, active, onPress }: { label: string; count: number; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} className={`rounded-xl border px-3 py-2 ${active ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}><Text className="text-xs font-semibold text-brand">{label} {count}</Text></Pressable> }
function NotificationCard({ item, onOpen, onAction }: { item: AppNotification & { category: AppNotificationCategory }; onOpen: () => void; onAction: () => void }) { const meta = categoryMeta[item.category]; return <Pressable onPress={onOpen}><Card className={`mt-4 p-4 ${item.read ? '' : 'border-brand'}`}><View className="flex-row items-start gap-3"><View className={`mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800`}><Feather name={meta.icon} size={17} color={item.category === 'reports' ? '#E11D48' : item.category === 'users' ? '#2563EB' : item.category === 'courses' ? '#059669' : '#64748B'} /></View><View className="flex-1"><View className="flex-row items-center justify-between"><Text className={`font-semibold ${meta.color}`}>{item.title}</Text>{!item.read ? <View className="h-2 w-2 rounded-full bg-brand" /> : null}</View><Text className="mt-1 text-sm text-ink dark:text-white">{item.body}</Text><Text className="mt-2 text-xs text-muted">{formatTime(item.createdAt)}</Text><Pressable onPress={onAction} className="mt-3 self-start rounded-lg bg-brand px-3 py-2"><Text className="text-xs font-semibold text-white">{actionLabel(item.category)}</Text></Pressable></View></View></Card></Pressable> }
function NotificationDetail({ item, onClose, onAction }: { item: NormalizedNotification | null; onClose: () => void; onAction: (item: AppNotification) => void }) { if (!item) return null; const meta = categoryMeta[item.category]; return <Modal visible transparent animationType="slide" onRequestClose={onClose}><View className="flex-1 justify-end bg-black/40"><View className="max-h-[75%] rounded-t-3xl bg-white p-5 dark:bg-slate-900"><View className="mt-5 flex-row items-center gap-3"><Feather name={meta.icon} size={22} color="#4F7EF7" /><Text className={`text-xl font-bold ${meta.color}`}>{item.title}</Text></View><Text className="mt-5 text-base leading-6 text-ink dark:text-white">{item.body}</Text><Text className="mt-4 text-sm text-muted">Created: {new Date(item.createdAt).toLocaleString()}</Text><Button className="mt-6" onPress={() => onAction(item)}>{actionLabel(item.category)}</Button></View></View></Modal> }
function actionLabel(category: AppNotificationCategory) { return category === 'reports' ? 'Review report' : category === 'users' ? 'Review users' : category === 'courses' ? 'Manage courses' : 'System details' }
function formatTime(timestamp: number) { const minutes = Math.floor((Date.now() - timestamp) / 60000); if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`; if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`; return `${Math.floor(minutes / 1440)}d ago` }
