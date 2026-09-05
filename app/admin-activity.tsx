import { useEffect, useState } from 'react'
import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Empty } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'
import type { ModerationHistoryItem } from '@/lib/types'

export default function AdminActivity() {
  const { profile } = useApp()
  const [items, setItems] = useState<ModerationHistoryItem[]>([])
  useEffect(() => { void services.moderationHistory().then(setItems) }, [])
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Activity log</Text><Text className="mt-1 text-sm text-muted">A durable record of admin actions.</Text>{items.length ? items.map(item => <Card key={item.id} className="mt-4"><Text className="font-semibold text-ink dark:text-white">{item.summary}</Text><Text className="mt-1 text-xs text-muted">{item.action.toUpperCase()} · {new Date(item.createdAt).toLocaleString()}</Text></Card>) : <Empty title="No activity yet" body="Admin actions will be recorded here." />}</ScrollView></SafeAreaView>
}
