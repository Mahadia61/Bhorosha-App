import { PageHeader } from '@/components/ui/ui'
import { router } from 'expo-router'
import { Pressable, Text } from 'react-native'
import { useApp } from '@/providers/AppProvider'

export function TeacherHeader({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  const { profile } = useApp()
  return <>
    <PageHeader title={title} subtitle={subtitle} eyebrow={eyebrow} />
    {profile?.teacherLinkPending ? <Pressable accessibilityRole="button" onPress={() => router.push('/verify-email')} className="my-3 rounded-xl bg-amber-50 p-3 dark:bg-slate-800"><Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">Verify your email to link your teacher profile and access assigned courses</Text></Pressable> : null}
  </>
}
