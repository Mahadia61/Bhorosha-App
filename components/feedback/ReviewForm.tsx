import { TextInput, View } from 'react-native'
import { Button } from '@/components/ui/ui'
export function ReviewForm({ value, onChangeText, onSubmit, loading = false }: { value: string; onChangeText: (value: string) => void; onSubmit: () => void; loading?: boolean }) {
  return <View><TextInput value={value} onChangeText={onChangeText} multiline placeholder="Share your experience" placeholderTextColor="#94A3B8" className="min-h-28 rounded-xl border border-line bg-white p-3 text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-white" /><Button className="mt-3" loading={loading} onPress={onSubmit}>Submit review</Button></View>
}
