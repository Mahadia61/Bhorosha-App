import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Card, Empty, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import type { Professor } from '@/lib/types'

export default function Professors() {
  const [items, setItems] = useState<Professor[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await services.professors())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load teachers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])
  const visible = useMemo(() => items.filter(item => `${item.name} ${item.department} ${item.designation ?? ''}`.toLowerCase().includes(search.toLowerCase())), [items, search])

  if (loading) return <Screen><View className="flex-1 items-center justify-center"><ActivityIndicator color="#4F7EF7" /><Text className="mt-3 text-sm text-muted">Loading teachers…</Text></View></Screen>

  return <Screen><FlatList data={visible} keyExtractor={item => item.id} contentContainerClassName="px-5 pb-6" ListHeaderComponent={<><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Teachers</Text><Text className="mt-1 text-sm text-muted">Explore teacher profiles and feedback.</Text><View className="my-5 flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900"><Feather name="search" size={18} color="#64748B" /><TextInput value={search} onChangeText={setSearch} placeholder="Search teachers" placeholderTextColor="#94A3B8" className="flex-1 px-3 py-3 text-base text-ink dark:text-white" /></View></>} ListEmptyComponent={<Empty title={error ? 'Unable to load teachers' : 'No teachers found'} body={error || 'Try another name or department.'} />} renderItem={({ item }) => <Card className="mb-3"><View className="flex-row items-center gap-3">{item.photoUrl ? <Image source={{ uri: item.photoUrl }} className="h-11 w-11 rounded-full bg-slate-200" /> : <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-100"><Text className="font-bold text-brand">{item.name.trim().charAt(0).toUpperCase() || 'T'}</Text></View>}<View className="flex-1"><Text onPress={() => router.push(`/professor/${item.id}`)} className="font-semibold text-ink dark:text-white">{item.name}</Text><Text className="mt-1 text-sm text-muted">{item.designation ? `${item.designation} · ` : ''}{item.department}</Text><Text onPress={() => router.push(`/professor/${item.id}`)} className="mt-2 text-xs font-semibold text-brand">View profile →</Text></View></View></Card>} /></Screen>
}
