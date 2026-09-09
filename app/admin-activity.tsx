import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { ModerationHistoryItem } from '@/lib/types'

export default function AdminActivity() {
  const { profile } = useApp()
  const [items, setItems] = useState<ModerationHistoryItem[]>([])
  useEffect(() => { void services.moderationHistory().then(setItems).catch(() => setItems([])) }, [])
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-[#F5F6F8] dark:bg-slate-950" edges={['top']}><ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
    <ProfileHeader title="Activity Log" subtitle="Your recent actions on the platform." onBack={() => router.back()} initial={profile.name?.charAt(0)} />
    <View className="mb-5 flex-row gap-3"><Filter label="All activities" /><Filter label="Recorded activity" /></View>
    {items.length ? <View className="rounded-2xl border border-[#E7EAF0] bg-white px-4 dark:border-slate-800 dark:bg-slate-900">{items.map((item, index) => <ActivityRow key={item.id} item={item} last={index === items.length - 1} />)}</View> : <View className="items-center rounded-2xl border border-[#E7EAF0] bg-white px-6 py-14 dark:border-slate-800 dark:bg-slate-900"><View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-[#E8F0FE]"><Feather name="clock" size={25} color="#0B6BFF" /></View><Text className="text-base font-bold text-[#172038] dark:text-white">No activity yet</Text><Text className="mt-2 text-center text-sm leading-5 text-[#73809A] dark:text-slate-400">Actions you take as an administrator will appear here.</Text></View>}
  </ScrollView><AdminBottomNav /></SafeAreaView>
}

function Filter({ label }: { label: string }) { return <View className="flex-1 flex-row items-center justify-between rounded-xl border border-[#E7EAF0] bg-white px-4 py-3"><Text className="text-sm font-medium text-[#172038]">{label}</Text><Feather name="chevron-down" size={17} color="#6B7790" /></View> }
function ActivityRow({ item, last }: { item: ModerationHistoryItem; last: boolean }) { const action = activityAppearance(item.action); return <View className={`flex-row gap-3 py-4 ${last ? '' : 'border-b border-[#EDF0F5] dark:border-slate-800'}`}><View className={`h-10 w-10 items-center justify-center rounded-full ${action.bg}`}><Feather name={action.icon as never} size={19} color={action.color} /></View><View className="flex-1"><Text className="text-sm font-bold text-[#172038] dark:text-white">{item.summary}</Text><Text className="mt-1 text-xs text-[#64718B] dark:text-slate-400">{item.targetType}</Text></View><Text className="text-xs text-[#64718B] dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</Text></View> }
function activityAppearance(action: ModerationHistoryItem['action']) { if (action === 'removed' || action === 'suspended') return { icon: 'flag', bg: 'bg-[#FFE8EA]', color: '#F04455' }; if (action === 'warned') return { icon: 'alert-circle', bg: 'bg-[#FFF3DD]', color: '#F5A623' }; if (action === 'activated') return { icon: 'check', bg: 'bg-[#E5F9ED]', color: '#13A65A' }; if (action === 'hidden' || action === 'archived') return { icon: 'archive', bg: 'bg-[#EEF2F7]', color: '#64718B' }; return { icon: 'check-circle', bg: 'bg-[#E8F0FE]', color: '#0B6BFF' } }
function ProfileHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void; initial?: string }) { return <View className="mb-7 mt-3 flex-row items-start gap-3"><Pressable onPress={onBack} className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-700 dark:bg-slate-900"><Feather name="arrow-left" size={22} color="#172038" /></Pressable><View className="flex-1"><Text className="text-[26px] font-extrabold tracking-tight text-[#10182F] dark:text-white">{title}</Text><Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">{subtitle}</Text></View></View> }
function AdminBottomNav() { const tabs = [{ label: 'Overview', icon: 'grid', href: '/(admin-tabs)/overview' }, { label: 'Courses', icon: 'book-open', href: '/(admin-tabs)/courses' }, { label: 'Members', icon: 'users', href: '/(admin-tabs)/members' }, { label: 'Moderation', icon: 'shield', href: '/(admin-tabs)/moderation' }, { label: 'Analytics', icon: 'bar-chart-2', href: '/(admin-tabs)/analytics' }]; return <View className="h-[76px] flex-row items-start border-t border-slate-200 bg-white px-1 pb-4 pt-3 dark:border-slate-800 dark:bg-slate-900">{tabs.map(tab => <Pressable key={tab.label} onPress={() => router.replace(tab.href as never)} className="flex-1 items-center"><Feather name={tab.icon as never} size={22} color="#6C7890" /><Text className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">{tab.label}</Text></Pressable>)}</View> }
