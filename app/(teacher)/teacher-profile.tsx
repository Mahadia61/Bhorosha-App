import { useEffect, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, PageHeader, Screen } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

type ProfileSection = 'overview' | 'edit' | 'settings' | 'delete'

export default function TeacherProfile() {
  const { profile, isDark, updateProfile, changePassword, setThemePreference, deleteTeacherAccount } = useApp()
  const { section: requestedSection } = useLocalSearchParams<{ section?: string }>()
  const [section, setSection] = useState<ProfileSection>(resolveSection(requestedSection))
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingAppearance, setChangingAppearance] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setBio(profile.bio ?? '')
  }, [profile?.name, profile?.bio])

  useEffect(() => {
    setSection(resolveSection(requestedSection))
    if (requestedSection === 'delete') setDeleteDialogOpen(true)
  }, [requestedSection])

  if (!profile || profile.role !== 'teacher') return <Redirect href="/" />
  if (section === 'overview') return <Redirect href="/(teacher-tabs)/dashboard" />

  const exitProfile = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/(teacher-tabs)/dashboard')
  }

  const saveProfile = async () => {
    if (!profile.teacherProfileId && !name.trim()) {
      Alert.alert('Enter your name', 'Your profile name cannot be empty.')
      return
    }
    if (bio.trim().length > 1000) {
      Alert.alert('Bio is too long', 'Keep your bio within 1000 characters.')
      return
    }
    setSaving(true)
    try {
      await updateProfile({
        ...profile,
        name: profile.teacherProfileId ? profile.name : name.trim(),
        bio: bio.trim(),
      })
      exitProfile()
    } catch (reason) {
      Alert.alert('Could not save profile', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Complete password fields', 'Enter your current password and your new password twice.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Re-enter the same new password.')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
      await setThemePreference(darkMode)
    } catch (reason) {
      Alert.alert('Could not update appearance', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setChangingAppearance(false)
    }
  }

  const removeAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your password to confirm account deletion.')
      return
    }
    setDeletingAccount(true)
    try {
      await deleteTeacherAccount(deletePassword)
      setDeletePassword('')
      setDeleteDialogOpen(false)
      router.replace('/welcome')
    } catch (reason) {
      Alert.alert('Could not delete account', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const title = section === 'edit' ? 'Edit Profile' : section === 'settings' ? 'Settings' : 'Delete Account'
  const subtitle = section === 'edit'
    ? 'Update your teacher profile details.'
    : section === 'settings'
      ? 'Manage appearance and account security.'
      : 'Permanently remove your login account.'

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="mt-4">
          <PageHeader
            title={title}
            subtitle={subtitle}
            onBack={exitProfile}
          />
        </View>

        {section === 'edit' ? (
          <Card className="mt-5">
            {!profile.teacherProfileId ? (
              <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />
            ) : (
              <>
                <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Full name</Text>
                <View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <Text className="text-base text-muted">{profile.name}</Text>
                </View>
                <Text className="mb-4 text-xs leading-4 text-muted">
                  Your name, designation, and department are managed by an administrator.
                </Text>
              </>
            )}
            <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Department</Text>
            <View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-base text-muted">{profile.department}</Text>
            </View>
            <Text className="mb-4 text-xs leading-4 text-muted">
              Department is managed by an administrator so course access remains protected.
            </Text>
            <Field
              label="Professional bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Share a short professional bio"
              multiline
              numberOfLines={5}
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text className="mb-4 text-xs text-muted">CUET email: {profile.email} · Email cannot be changed.</Text>
            <Button loading={saving} onPress={() => { void saveProfile() }}>Save Changes</Button>
          </Card>
        ) : null}

        {section === 'settings' ? (
          <>
            <Card className="mt-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Feather name={isDark ? 'moon' : 'sun'} color="#4F7EF7" size={19} />
                  <View>
                    <Text className="font-medium text-ink dark:text-white">Dark mode</Text>
                    <Text className="text-xs text-muted">Use a comfortable darker appearance.</Text>
                  </View>
                </View>
                <Switch
                  disabled={changingAppearance}
                  value={isDark}
                  onValueChange={darkMode => { void toggleDarkMode(darkMode) }}
                />
              </View>
            </Card>
            <Card className="mt-3">
              <Text className="font-medium text-ink dark:text-white">Change password</Text>
              <Text className="mt-1 text-xs leading-5 text-muted">
                Confirm your current password before choosing a new one.
              </Text>
              <View className="mt-4">
                <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Your current password" />
                <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="At least 8 characters" />
                <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Enter the new password again" />
                <Button loading={changingPassword} variant="outline" onPress={() => { void savePassword() }}>
                  Update password
                </Button>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
      <Modal
        visible={deleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deletingAccount) {
            setDeleteDialogOpen(false)
            setDeletePassword('')
            exitProfile()
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full max-w-md rounded-2xl bg-white p-5 dark:bg-slate-900">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950">
                <Feather name="alert-triangle" size={20} color="#EF4444" />
              </View>
              <Text className="flex-1 text-lg font-extrabold text-ink dark:text-white">
                Delete your account?
              </Text>
            </View>
            <Text className="mt-4 text-sm leading-5 text-muted">
              Your login and private account data will be removed. Your teacher profile, courses, and public contributions will remain. This cannot be undone.
            </Text>
            <Text className="mb-1.5 mt-5 text-sm font-medium text-ink dark:text-slate-100">
              Enter your password to continue
            </Text>
            <TextInput
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Your current password"
              placeholderTextColor="#94A3B8"
              editable={!deletingAccount}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-ink dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <View className="mt-5 flex-row gap-3">
              <Pressable
                disabled={deletingAccount}
                onPress={() => {
                  setDeleteDialogOpen(false)
                  setDeletePassword('')
                  exitProfile()
                }}
                className="flex-1 items-center rounded-xl border border-slate-200 py-3 dark:border-slate-700"
              >
                <Text className="font-semibold text-ink dark:text-white">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={deletingAccount}
                onPress={() => { void removeAccount() }}
                className={`flex-1 items-center rounded-xl bg-rose-600 py-3 ${deletingAccount ? 'opacity-60' : ''}`}
              >
                <Text className="font-semibold text-white">
                  {deletingAccount ? 'Deleting…' : 'Delete Account'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

function resolveSection(section?: string): ProfileSection {
  return section === 'edit' || section === 'settings' || section === 'delete' ? section : 'overview'
}
