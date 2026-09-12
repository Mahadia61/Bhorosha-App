import { Modal, Pressable, Text, View } from 'react-native'
import { Button } from '@/components/ui/ui'

export function ConfirmationDialog({ visible, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }: {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View className="flex-1 items-center justify-center bg-black/40 px-5">
      <View className="w-full rounded-2xl bg-white p-5 dark:bg-slate-900">
        <Text className="text-lg font-bold text-ink dark:text-white">{title}</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">{message}</Text>
        <View className="mt-5 flex-row gap-3">
          <Button variant="outline" className="flex-1" onPress={onCancel}>Cancel</Button>
          <Button variant="danger" className="flex-1" onPress={onConfirm}>{confirmLabel}</Button>
        </View>
      </View>
    </View>
  </Modal>
}
