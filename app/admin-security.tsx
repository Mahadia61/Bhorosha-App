import { ScrollView, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function AdminSecurity() {
  const { profile } = useApp()
  if (!profile || profile.role !== 'admin') return null
  return <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950"><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}><Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Security</Text><Text className="mt-1 text-sm text-muted">Protect the administrator account and review access controls.</Text><Card className="mt-5"><Text className="font-semibold text-ink dark:text-white">Last login</Text><Text className="mt-1 text-sm text-muted">Current Firebase session · {new Date().toLocaleString()}</Text></Card><Card className="mt-3"><Text className="font-semibold text-ink dark:text-white">Password and two-factor authentication</Text><Text className="mt-1 text-sm leading-5 text-muted">Use the password controls in Admin Profile. Firebase Authentication remains the source of truth for administrator credentials. Two-factor authentication can be enabled in the Firebase Console for this project.</Text></Card></ScrollView></SafeAreaView>
}
