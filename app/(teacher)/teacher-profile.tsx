import { Alert, View } from 'react-native'
import { router, Redirect } from 'expo-router'
import { Card, PageHeader, Screen } from '@/components/ui'
import { ProfileActionRow, ProfileIdentityCard } from '@/components/common/ProfileComponents'
import { useApp } from '@/providers/AppProvider'

export default function TeacherProfile() {
  const { profile, signOut } = useApp()
  if (profile?.role !== 'teacher') return <Redirect href="/" />
  const logout = async () => {
    try { await signOut(); router.replace('/welcome') } catch (reason) { Alert.alert('Could not sign out', reason instanceof Error ? reason.message : 'Please try again.') }
  }
  return <Screen>
    <View className="px-5 pt-3">
      <View className="mt-4">
        <PageHeader title="Profile" subtitle="Manage your account and preferences." />
      </View>
      <ProfileIdentityCard
        name={profile.name}
        email={profile.email}
        role="Teacher"
        detail={`${profile.designation ?? 'Teacher'} · Department of ${profile.department}`}
        photoUrl={profile.photoUrl}
      />
      <Card className="mt-3 p-0">
        <ProfileActionRow
          icon="settings"
          title="Settings"
          subtitle="Dark mode and password"
          onPress={() => router.push('/teacher-settings')}
        />
      </Card>
      <Card className="mt-3 p-0">
        <ProfileActionRow
          icon="log-out"
          title="Sign out"
          danger
          onPress={() => { void logout() }}
        />
      </Card>
    </View>
  </Screen>
}
