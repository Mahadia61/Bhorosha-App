import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import { Feather } from '@expo/vector-icons'
import { Button } from '@/components/ui/ui'
import type { ContentType, ReportReason } from '@/lib/types/types'

export const reportReasons: ReportReason[] = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Offensive language', 'Other']

export function ReportModal({ visible, contentType, onClose, onSubmit }: {
  visible: boolean
  contentType: ContentType
  onClose: () => void
  onSubmit: (reason: ReportReason, description: string) => Promise<void>
}) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const submit = async () => {
    if (!reason) return
    await onSubmit(reason, description.trim())
    setReason(null)
    setDescription('')
  }
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View className="flex-1 justify-end bg-black/40">
      <View className="rounded-t-3xl bg-white p-5 dark:bg-slate-900">
        <View className="flex-row items-center justify-between">
          <View><Text className="text-xl font-bold text-ink dark:text-white">Report content</Text><Text className="mt-1 text-sm text-muted">Help keep Bhorosha respectful.</Text></View>
          <Pressable onPress={onClose}><Feather name="x" size={22} color="#64748B" /></Pressable>
        </View>
        <Text className="mt-5 text-sm font-semibold text-ink dark:text-white">Why are you reporting this?</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">{reportReasons.map(item => <Pressable key={item} onPress={() => setReason(item)} className={`rounded-xl border px-3 py-3 ${reason === item ? 'border-brand bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700'}`}><Text className={`text-sm ${reason === item ? 'font-semibold text-brand' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>
        {reason === 'Other' ? <TextInput value={description} onChangeText={setDescription} multiline maxLength={500} placeholder="Add an optional description" placeholderTextColor="#94A3B8" className="mt-4 min-h-20 rounded-xl border border-slate-200 p-3 text-sm text-ink dark:border-slate-700 dark:text-white" /> : null}
        <Button className="mt-5" disabled={!reason} onPress={() => { void submit() }}>Submit report</Button>
        <Pressable onPress={onClose} className="mt-3 items-center py-2"><Text className="font-semibold text-muted">Cancel</Text></Pressable>
      </View>
    </View>
  </Modal>
}
