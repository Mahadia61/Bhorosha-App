import { useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { Redirect } from 'expo-router'
import { Button, Card, Field, Screen } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function TeacherSettings() {
  const { profile, isDark, updateProfile, changePassword } = useApp()
  const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [confirm, setConfirm] = useState(''); const [saving, setSaving] = useState(false)
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const savePassword = async () => { if (!current || !next || next !== confirm) return Alert.alert('Check password fields', 'Enter the current password and matching new passwords.'); setSaving(true); try { await changePassword(current, next); setCurrent(''); setNext(''); setConfirm(''); Alert.alert('Password updated', 'Your password has been changed.') } catch (reason) { Alert.alert('Could not change password', reason instanceof Error ? reason.message : 'Please try again.') } finally { setSaving(false) } }
  return <Screen><View className="px-5 pt-6"><Text className="text-2xl font-bold text-ink dark:text-white">Settings</Text><Card className="mt-5"><View className="flex-row items-center justify-between"><View><Text className="font-semibold text-ink dark:text-white">Dark mode</Text><Text className="mt-1 text-xs text-muted">Use a darker appearance.</Text></View><Switch value={isDark} onValueChange={darkMode => { void updateProfile({ ...profile, darkMode }) }} /></View></Card><Card className="mt-4"><Text className="font-semibold text-ink dark:text-white">Change password</Text><View className="mt-4"><Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" /><Field label="New password" value={next} onChangeText={setNext} secureTextEntry placeholder="New password" /><Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Confirm password" /><Button loading={saving} onPress={() => { void savePassword() }}>Update password</Button></View></Card></View></Screen>
}
