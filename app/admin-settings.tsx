import { useState } from 'react'
import { ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Card, Field } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function AdminSettings() {
  const { profile } = useApp()
  const [anonymousReviews, setAnonymousReviews] = useState(true)
  const [teacherResponses, setTeacherResponses] = useState(true)
  const [minimumReports, setMinimumReports] = useState('3')
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Settings</Text><Text className="mt-1 text-sm text-muted">Configure review and trust-and-safety defaults.</Text><Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Review settings</Text><Card className="mt-3"><SettingRow title="Anonymous reviews" description="Allow students to publish feedback anonymously." value={anonymousReviews} onChange={setAnonymousReviews} /><SettingRow title="Teacher responses" description="Allow teachers to respond to published feedback." value={teacherResponses} onChange={setTeacherResponses} /><Field label="Minimum report count" value={minimumReports} onChangeText={setMinimumReports} keyboardType="number-pad" placeholder="3" /></Card><Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Security</Text><Card className="mt-3"><Text className="font-semibold text-ink dark:text-white">Change password</Text><Text className="mt-1 text-sm leading-5 text-muted">Use Admin Profile to update the administrator password.</Text><Text onPress={() => router.push('/admin-profile' as never)} className="mt-3 font-semibold text-brand">Open password controls</Text><View className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><Text className="font-semibold text-ink dark:text-white">Two-factor authentication</Text><Text className="mt-1 text-sm leading-5 text-muted">Enable MFA for this admin account from Firebase Authentication project settings.</Text></View><View className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800"><Text className="font-semibold text-ink dark:text-white">Login history</Text><Text className="mt-1 text-sm leading-5 text-muted">Current session: {new Date().toLocaleString()}</Text></View></Card></ScrollView></SafeAreaView>
}

function SettingRow({ title, description, value, onChange }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void }) { return <View className="mb-5 flex-row items-center justify-between"><View className="flex-1 pr-4"><Text className="font-medium text-ink dark:text-white">{title}</Text><Text className="mt-1 text-xs leading-4 text-muted">{description}</Text></View><Switch value={value} onValueChange={onChange} /></View> }
