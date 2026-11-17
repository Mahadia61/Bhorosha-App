import { useEffect, useState } from 'react'
import { Alert, ScrollView, Switch, Text, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Card, Field, PageHeader, Screen } from '@/components/ui'
import { ProfileActionRow, ProfileIdentityCard } from '@/components/common/ProfileComponents'
import { useApp } from '@/providers/AppProvider'

type ProfileSection = 'overview' | 'edit' | 'settings'

export default function TeacherProfile() {
  const { profile, isDark, updateProfile, changePassword, setThemePreference, signOut } = useApp()
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
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setBio(profile.bio ?? '')
  }, [profile?.name, profile?.bio])

  useEffect(() => {
    setSection(resolveSection(requestedSection))
  }, [requestedSection])

  if (!profile || profile.role !== 'teacher') return <Redirect href="/" />

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
      setSection('overview')
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

  const title = section === 'overview' ? 'Profile' : section === 'edit' ? 'Edit Profile' : 'Settings'
  const subtitle = section === 'overview'
    ? 'Manage your account and preferences.'
    : section === 'edit'
      ? 'Update your teacher profile details.'
      : 'Manage appearance and account security.'

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
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
              role="Teacher"
              detail={`${profile.designation ?? 'Teacher'} · Department of ${profile.department}`}
              photoUrl={profile.photoUrl}
            />
            <Card className="mt-3 p-0">
              <ProfileActionRow icon="user" title="Edit Profile" onPress={() => setSection('edit')} />
              <ProfileActionRow icon="settings" title="Settings" onPress={() => setSection('settings')} />
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
    </Screen>
  )
}

function resolveSection(section?: string): ProfileSection {
  return section === 'edit' || section === 'settings' ? section : 'overview'
}
