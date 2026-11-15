import { useEffect, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, PageHeader, Screen } from '@/components/ui/ui'
import { ProfileActionRow, ProfileIdentityCard } from '@/components/common/ProfileComponents'
import { useApp } from '@/providers/AppProvider'
import { academicLabel } from '@/lib/utils/academic'

type ProfileSection = 'overview' | 'edit' | 'settings' | 'delete'

export default function ProfileScreen() {
  const { profile, isDark, updateProfile, changePassword, setThemePreference, deleteStudentAccount, signOut } = useApp()
  const { section: requestedSection } = useLocalSearchParams<{ section?: string }>()
  const [section, setSection] = useState<ProfileSection>(resolveSection(requestedSection))
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [changingAppearance, setChangingAppearance] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    if (profile) setName(profile.name)
  }, [profile?.name])
  useEffect(() => {
    setSection(resolveSection(requestedSection))
    if (requestedSection === 'delete') setDeleteDialogOpen(true)
  }, [requestedSection])

  if (!profile || profile.role !== 'student') return null

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert('Enter your name', 'Your profile name cannot be empty.')
    setSaving(true)
    try {
      await updateProfile({ ...profile, name: name.trim() })
      setSection('overview')
    } catch (reason) {
      Alert.alert('Could not save profile', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Alert.alert('Complete password fields', 'Enter your current password and your new password twice.')
    }
    if (newPassword !== confirmPassword) return Alert.alert('Passwords do not match', 'Re-enter the same new password.')
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

  const removeAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your password to confirm account deletion.')
      return
    }
    setDeletingAccount(true)
    try {
      await deleteStudentAccount(deletePassword)
      setDeletePassword('')
      setDeleteDialogOpen(false)
      router.replace('/welcome')
    } catch (reason) {
      Alert.alert('Could not delete account', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setDeletingAccount(false)
    }
  }

  const title = section === 'overview'
    ? 'Profile'
    : section === 'edit'
      ? 'Edit Profile'
      : section === 'delete'
        ? 'Delete Account'
        : 'Settings'
  const subtitle = section === 'overview'
    ? 'Manage your account and preferences.'
    : section === 'edit'
      ? 'Update your student account details.'
      : section === 'settings'
        ? 'Manage appearance and account security.'
        : 'Permanently remove your account.'

  return (
    <Screen>
      <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="mt-4">
          <PageHeader
            title={title}
            subtitle={subtitle}
            onBack={section === 'overview' ? undefined : () => setSection('overview')}
          />
        </View>

        {section === 'overview' ? (
          <>
            <ProfileIdentityCard
              name={profile.name}
              email={profile.email}
              role="Student"
              detail={`Department of ${profile.department}`}
              photoUrl={profile.photoUrl}
            />
            <Card className="mt-3 p-0">
              <ProfileActionRow icon="user" title="Edit Profile" onPress={() => setSection('edit')} />
              <ProfileActionRow icon="settings" title="Settings" onPress={() => setSection('settings')} />
            </Card>
            <Card className="mt-3 p-0">
              <ProfileActionRow
                icon="trash-2"
                title="Delete Account"
                subtitle="Permanently remove your account and contributions"
                danger
                onPress={() => setDeleteDialogOpen(true)}
              />
            </Card>
            <Card className="mt-3 p-0">
              <ProfileActionRow
                icon="log-out"
                title={signingOut ? 'Signing out…' : 'Sign out'}
                danger
                onPress={() => { void logout() }}
              />
            </Card>
          </>
        ) : null}

        {section === 'edit' ? (
          <Card className="mt-5">
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />
            <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Department</Text>
            <View className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-base text-muted">{profile.department}</Text>
            </View>
            <Text className="mb-4 text-xs leading-4 text-muted">
              Department is locked after registration so course access remains protected. Ask an administrator if it needs correction.
            </Text>
            <View className="mb-4 rounded-xl bg-blue-50 p-3 dark:bg-slate-800">
              <Text className="text-xs font-bold text-brand">ACADEMIC RECORD</Text>
              <Text className="mt-2 text-sm text-ink dark:text-white">Student ID: {profile.studentId ?? 'Not recorded'}</Text>
              <Text className="mt-1 text-sm text-ink dark:text-white">Batch: {profile.batch ?? 'Not recorded'}</Text>
              <Text className="mt-1 text-sm text-ink dark:text-white">
                {academicLabel(profile.currentLevel ?? null, profile.currentTerm ?? null)}
              </Text>
            </View>
            <Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">CUET email</Text>
            <View className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <Text className="text-base text-muted">{profile.email}</Text>
            </View>
            <Text className="mb-5 text-xs text-muted">Email cannot be changed.</Text>
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
              This permanently removes your account, reviews, questions, answers, advice, reports, and votes. This cannot be undone.
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
  return section === 'edit' || section === 'settings' || section === 'delete'
    ? section
    : 'overview'
}
