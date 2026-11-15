import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useEffect, useState } from 'react'
import { Feather } from '@expo/vector-icons'
import { Button } from '@/components/ui/ui'
import type { ContentType, ReportReason } from '@/lib/types/types'

export const reportReasons: ReportReason[] = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Offensive language', 'Other']

type PopoverPosition = { left: number; top: number; width: number; maxHeight: number }

export function ReportModal({ visible, contentType, position, onClose, onSubmit }: {
  visible: boolean
  contentType: ContentType
  position: PopoverPosition
  onClose: () => void
  onSubmit: (reason: ReportReason, description: string) => Promise<void>
}) {
  const [stage, setStage] = useState<'actions' | 'form'>('actions')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (visible) {
      setStage('actions')
      setReason(null)
      setDescription('')
    }
  }, [visible, contentType])

  const submit = async () => {
    if (!reason) return
    await onSubmit(reason, description.trim())
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close report options"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          className="absolute overflow-hidden rounded-2xl bg-white p-4 dark:bg-slate-800"
          style={{
            left: position.left,
            top: position.top,
            width: position.width,
            maxHeight: position.maxHeight,
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          {stage === 'actions' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStage('form')}
              className="flex-row items-center gap-3 py-1"
            >
              <Feather name="flag" size={19} color="#172038" />
              <Text className="text-sm font-medium text-[#172038] dark:text-white">Report</Text>
            </Pressable>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 2 }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink dark:text-white">Report content</Text>
                  <Text className="mt-0.5 text-xs text-muted">Help keep Bhorosha respectful.</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close report" onPress={onClose} hitSlop={8}>
                  <Feather name="x" size={20} color="#64748B" />
                </Pressable>
              </View>
              <Text className="mb-2 mt-4 text-sm font-semibold text-ink dark:text-white">
                Why are you reporting this?
              </Text>
              <View className="gap-1">
                {reportReasons.map(item => (
                  <Pressable
                    key={item}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: reason === item }}
                    onPress={() => setReason(item)}
                    className={`flex-row items-center justify-between rounded-lg px-3 py-2 ${reason === item ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
                  >
                    <Text className={`text-sm ${reason === item ? 'font-semibold text-brand' : 'text-muted'}`}>{item}</Text>
                    {reason === item ? <Feather name="check" size={16} color="#1670F8" /> : null}
                  </Pressable>
                ))}
              </View>
              {reason === 'Other' ? (
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  maxLength={500}
                  placeholder="Add an optional description"
                  placeholderTextColor="#94A3B8"
                  className="mt-3 min-h-16 rounded-lg border border-slate-200 p-2.5 text-sm text-ink dark:border-slate-700 dark:text-white"
                />
              ) : null}
              <Button className="mt-3" disabled={!reason} onPress={() => { void submit() }}>
                Submit report
              </Button>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
