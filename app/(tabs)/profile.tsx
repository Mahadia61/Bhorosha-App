import { useEffect, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, Screen } from '@/components/ui'
import { services } from '@/lib/services'
import { useApp } from '@/providers/AppProvider'

export default function ProfileScreen() {
  const { profile, isDark, updateProfile, changePassword, signOut } = useApp()
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name); setDepartment(profile.department); setDesignation(profile.designation ?? '')
  }, [profile])

  if (!profile) return null
  const isTeacher = profile.role === 'teacher'

  const saveDetails = async () => {
    if (!name.trim() || !department.trim() || (isTeacher && !designation.trim())) return Alert.alert('Complete your profile', 'Add your name, department, and teaching position.')
    setSaving(true)
    try {
      await updateProfile({ ...profile, name: name.trim(), department: department.trim().toUpperCase(), designation: isTeacher ? designation.trim() : undefined })
      Alert.alert('Profile updated', 'Your account details have been saved.')
    } catch (reason) {
      Alert.alert('Could not save profile', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return Alert.alert('Photo permission required', 'Allow photo-library access to choose a profile picture.')
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
    if (result.canceled || !result.assets[0]) return
    setUploading(true)
    try {
      const photoUrl = await services.uploadProfilePhoto(profile.id, result.assets[0].uri)
      await updateProfile({ ...profile, photoUrl })
      Alert.alert('Profile photo updated', 'Your new profile picture is ready.')
    } catch (reason) {
      Alert.alert('Could not upload photo', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return Alert.alert('Complete password fields', 'Enter your current password and your new password twice.')
    if (newPassword !== confirmPassword) return Alert.alert('Passwords do not match', 'Re-enter the same new password.')
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      Alert.alert('Password updated', 'Your password has been changed successfully.')
    } catch (reason) {
      Alert.alert('Could not change password', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  const logout = () => Alert.alert('Sign out?', 'You can sign back in anytime.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => { void signOut().then(() => router.replace('/welcome')) } }])

  return <Screen><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
    <Text className="mt-6 text-2xl font-bold text-ink dark:text-white">Profile & settings</Text>
    <Card className="mt-5"><View className="flex-row items-center gap-4">{profile.photoUrl ? <Image source={{ uri: profile.photoUrl }} className="h-16 w-16 rounded-full bg-slate-200" /> : <View className="h-16 w-16 items-center justify-center rounded-full bg-brand"><Text className="text-2xl font-bold text-white">{profile.name[0]}</Text></View>}<View className="flex-1"><Text className="text-lg font-semibold text-ink dark:text-white">{profile.name}</Text><Text className="mt-0.5 text-sm text-muted">{profile.email}</Text><Text className="mt-1 text-xs font-semibold uppercase text-brand">{profile.role}{profile.designation ? ` · ${profile.designation}` : ''}</Text></View></View>{isTeacher ? <Pressable accessibilityRole="button" onPress={() => { void choosePhoto() }} className={`mt-4 flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 py-2.5 dark:border-slate-700 ${uploading ? 'opacity-50' : ''}`}><Feather name="camera" size={17} color="#4F7EF7" /><Text className="text-sm font-semibold text-brand">{uploading ? 'Uploading photo…' : 'Upload profile photo'}</Text></Pressable> : null}</Card>

    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Account details</Text>
    <Card className="mt-3"><Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" /><Field label="Department" value={department} onChangeText={setDepartment} placeholder="CSE" autoCapitalize="characters" />{isTeacher ? <Field label="Teaching position" value={designation} onChangeText={setDesignation} placeholder="Assistant Professor" autoCapitalize="words" /> : null}<Text className="mb-4 text-sm font-medium text-ink dark:text-slate-100">CUET email</Text><View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"><Text className="text-base text-muted">{profile.email}</Text></View><Button loading={saving} onPress={saveDetails}>Save profile</Button></Card>

    {isTeacher ? <Card className="mt-3"><View className="flex-row gap-3"><Feather name="shield" size={19} color="#4F7EF7" /><View className="flex-1"><Text className="font-medium text-ink dark:text-white">Privacy promise</Text><Text className="mt-1 text-xs leading-5 text-muted">You can read course feedback and answer questions, but student identities remain protected.</Text></View></View></Card> : null}

    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Appearance</Text>
    <Card className="mt-3"><View className="flex-row items-center justify-between"><View className="flex-row items-center gap-3"><Feather name={isDark ? 'moon' : 'sun'} color="#4F7EF7" size={19} /><View><Text className="font-medium text-ink dark:text-white">Dark mode</Text><Text className="text-xs text-muted">Use a comfortable darker appearance.</Text></View></View><Switch value={profile.darkMode ?? false} onValueChange={darkMode => { void updateProfile({ ...profile, darkMode }) }} /></View></Card>

    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Security</Text>
    <Card className="mt-3"><Text className="font-medium text-ink dark:text-white">Change password</Text><Text className="mt-1 text-xs leading-5 text-muted">Confirm your current password before choosing a new one.</Text><View className="mt-4"><Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Your current password" /><Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" /><Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Enter the new password again" /><Button loading={changingPassword} variant="outline" onPress={savePassword}>Update password</Button></View></Card>

    {profile.role === 'admin' ? <Card className="mt-3"><Text onPress={() => router.push('/(admin-tabs)/overview')} className="font-medium text-ink dark:text-white">Open admin workspace</Text><Text className="mt-1 text-xs text-muted">Manage members, tagged courses, assignments, moderation, and analytics.</Text></Card> : <Card className="mt-3"><Text onPress={() => router.push('/my-reviews')} className="font-medium text-ink dark:text-white">My reviews</Text><Text className="mt-1 text-xs text-muted">View feedback you have shared.</Text></Card>}
    <Button className="mt-7" variant="danger" onPress={logout}>Sign out</Button>
  </ScrollView></Screen>
}
