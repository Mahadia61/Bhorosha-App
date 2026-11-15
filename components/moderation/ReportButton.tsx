import { Alert, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useRef, useState } from 'react'
import { Feather } from '@expo/vector-icons'
import { ReportModal } from './ReportModal'
import { services } from '@/lib/services/services'
import type { ContentType } from '@/lib/types/types'

export function ReportButton({ contentType, contentId, questionId, courseInstanceId }: { contentType: ContentType; contentId: string; questionId?: string; courseInstanceId?: string }) {
  const [open, setOpen] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 0 })
  const anchorRef = useRef<View>(null)
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const showMenu = () => {
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const panelWidth = Math.min(320, windowWidth - 16)
      const panelHeight = Math.min(420, windowHeight - 16)
      const left = Math.max(8, Math.min(x + width - panelWidth, windowWidth - panelWidth - 8))
      const below = y + height + 6
      const top = below + panelHeight <= windowHeight - 8
        ? below
        : y - panelHeight - 6 >= 8
          ? y - panelHeight - 6
          : Math.max(8, Math.min(below, windowHeight - panelHeight - 8))
      setPopoverPosition({ left, top, width: panelWidth, maxHeight: panelHeight })
      setOpen(true)
    })
  }
  const submit = async (reason: Parameters<typeof services.reportContent>[2], description: string) => {
    try {
      await services.reportContent(contentType, contentId, reason, questionId, description, courseInstanceId)
      setOpen(false)
      Alert.alert('Report submitted', 'An administrator will review this content.')
    } catch (error) {
      Alert.alert('Could not submit report', error instanceof Error ? error.message : 'Please try again.')
    }
  }
  return <>
    <View ref={anchorRef} collapsable={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        onPress={showMenu}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full"
      >
        <Feather name="more-vertical" size={20} color="#64718B" />
      </Pressable>
    </View>
    <ReportModal
      visible={open}
      contentType={contentType}
      position={popoverPosition}
      onClose={() => setOpen(false)}
      onSubmit={submit}
    />
  </>
}
