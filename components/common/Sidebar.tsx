import { Pressable, Text, View } from 'react-native'

export function Sidebar({ items, active, onSelect }: {
  items: { key: string; label: string }[]
  active: string
  onSelect: (key: string) => void
}) {
  return <View className="gap-1">{items.map(item => <Pressable key={item.key} onPress={() => onSelect(item.key)} className={`rounded-xl px-3 py-3 ${active === item.key ? 'bg-brandSoft' : ''}`}><Text className={`text-sm font-semibold ${active === item.key ? 'text-brand' : 'text-muted'}`}>{item.label}</Text></Pressable>)}</View>
}
