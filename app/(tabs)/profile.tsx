import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, PageHeader, Screen } from '@/components/ui/ui'
import { ProfileActionRow, ProfileIdentityCard } from '@/components/common/ProfileComponents'
import { userService } from '@/features/users'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/utils/academic'

export default function ProfileScreen() {
  const { profile, isDark, updateProfile, changePassword, signOut } = useApp()
  const [name, setName] = useState('')
  const [designation, setDesignation] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingAppearance, setChangingAppearance] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name); setDesignation(profile.designation ?? ''); setBio(profile.bio ?? '')
  }, [profile])

  if (!profile) return null
  const isTeacher = profile.role === 'teacher'

  const saveDetails = async () => {
    if (!name.trim() || (isTeacher && !designation.trim())) return Alert.alert('Complete your profile', 'Add your name and teaching position.')
    setSaving(true)
    try {
      await updateProfile({ ...profile, name: name.trim(), designation: isTeacher ? designation.trim() : undefined, bio: isTeacher ? bio.trim() : undefined })
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
      const photoUrl = await userService.uploadProfilePhoto(profile.id, result.assets[0].uri)
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

  const toggleDarkMode = async (darkMode: boolean) => {
    setChangingAppearance(true)
    try {
      await updateProfile({ ...profile, darkMode })
    } catch (reason) {
      Alert.alert('Could not update appearance', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setChangingAppearance(false)
    }
  }

  const logout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      router.replace('/welcome')
    } catch (reason) {
      Alert.alert('Could not sign out', reason instanceof Error ? reason.message : 'Please try again.')
      setSigningOut(false)
    }
  }

  return <Screen><ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
    <View className="mt-4"><PageHeader title="Profile" subtitle="Manage your account and preferences." /></View>
    <ProfileIdentityCard name={profile.name} email={profile.email} role={profile.role === 'admin' ? 'Administrator' : profile.role === 'teacher' ? 'Teacher' : 'Student'} detail={profile.designation} photoUrl={profile.photoUrl} />
    {isTeacher ? <Pressable accessibilityRole="button" onPress={() => { void choosePhoto() }} className={`mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 dark:border-slate-700 dark:bg-slate-900 ${uploading ? 'opacity-50' : ''}`}><Feather name="camera" size={17} color="#4F7EF7" /><Text className="text-sm font-semibold text-brand">{uploading ? 'Uploading photo…' : 'Upload profile photo'}</Text></Pressable> : null}
    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Account details</Text>
    <Card className="mt-3"><Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />{isTeacher ? <><Field label="Teaching position" value={designation} onChangeText={setDesignation} placeholder="Assistant Professor" /><Field label="Teaching bio" value={bio} onChangeText={setBio} placeholder="Teaching interests, office hours, or a short introduction" multiline numberOfLines={3} /></> : null}{profile.role !== 'admin' ? <><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Department</Text><View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"><Text className="text-base text-muted">{profile.department}</Text></View><Text className="mb-4 text-xs leading-4 text-muted">Department is locked after registration so course access remains protected. Ask an administrator if it needs correction.</Text></> : null}{profile.role === 'student' ? <View className="mb-4 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"><Text className="text-xs font-bold text-brand">ACADEMIC RECORD</Text><Text className="mt-2 text-sm text-ink dark:text-white">Student ID: {profile.studentId ?? 'Not recorded'}</Text><Text className="mt-1 text-sm text-ink dark:text-white">Batch: {profile.batch ?? 'Not recorded'}</Text><Text className="mt-1 text-sm text-ink dark:text-white">{academicLabel(profile.currentLevel ?? null, profile.currentTerm ?? null)}</Text></View> : null}<Text className="mb-4 text-sm font-medium text-ink dark:text-slate-100">CUET email</Text><View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800"><Text className="text-base text-muted">{profile.email}</Text></View><Button loading={saving} onPress={saveDetails}>Save profile</Button></Card>

    {isTeacher ? <Card className="mt-3"><View className="flex-row gap-3"><Feather name="shield" size={19} color="#4F7EF7" /><View className="flex-1"><Text className="font-medium text-ink dark:text-white">Privacy promise</Text><Text className="mt-1 text-xs leading-5 text-muted">You can read course feedback and answer questions, but student identities remain protected.</Text></View></View></Card> : null}

    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Appearance</Text>
    <Card className="mt-3"><View className="flex-row items-center justify-between"><View className="flex-row items-center gap-3"><Feather name={isDark ? 'moon' : 'sun'} color="#4F7EF7" size={19} /><View><Text className="font-medium text-ink dark:text-white">Dark mode</Text><Text className="text-xs text-muted">Use a comfortable darker appearance.</Text></View></View><Switch disabled={changingAppearance} value={profile.darkMode ?? false} onValueChange={darkMode => { void toggleDarkMode(darkMode) }} /></View></Card>

    <Text className="mt-7 text-sm font-bold uppercase tracking-wider text-muted">Security</Text>
    <Card className="mt-3"><Text className="font-medium text-ink dark:text-white">Change password</Text><Text className="mt-1 text-xs leading-5 text-muted">Confirm your current password before choosing a new one.</Text><View className="mt-4"><Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Your current password" /><Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" /><Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Enter the new password again" /><Button loading={changingPassword} variant="outline" onPress={savePassword}>Update password</Button></View></Card>

    {profile.role === 'admin' ? <Card className="mt-3"><Text onPress={() => router.push('/(admin-tabs)/overview')} className="font-medium text-ink dark:text-white">Open admin workspace</Text><Text className="mt-1 text-xs text-muted">Manage members, tagged courses, assignments, moderation, and analytics.</Text></Card> : profile.role === 'student' ? <Card className="mt-3"><Text onPress={() => router.push('/my-reviews')} className="font-medium text-ink dark:text-white">My reviews</Text><Text className="mt-1 text-xs text-muted">View feedback you have shared.</Text></Card> : <Card className="mt-3"><Text onPress={() => router.push('/(teacher-tabs)/courses')} className="font-medium text-ink dark:text-white">My assigned courses</Text><Text className="mt-1 text-xs text-muted">Open reviews, Q&A, and advice for the courses assigned to you.</Text></Card>}
    <Card className="mt-7 p-0"><ProfileActionRow icon="log-out" title={signingOut ? "Signing out…" : "Sign out"} danger onPress={() => { void logout() }} /></Card>
  </ScrollView></Screen>
}
