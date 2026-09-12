import { Alert, Pressable, Text } from 'react-native'
import { useState } from 'react'
import { ReportModal } from './ReportModal'
import { services } from '@/lib/services/services'
import type { ContentType } from '@/lib/types/types'

export function ReportButton({ contentType, contentId, questionId, courseInstanceId }: { contentType: ContentType; contentId: string; questionId?: string; courseInstanceId?: string }) {
  const [open, setOpen] = useState(false)
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
    <Pressable onPress={() => setOpen(true)}><Text className="text-xs font-semibold text-rose-600">Report</Text></Pressable>
    <ReportModal visible={open} contentType={contentType} onClose={() => setOpen(false)} onSubmit={submit} />
  </>
}
