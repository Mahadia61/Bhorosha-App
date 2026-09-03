import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'

const icons = { overview: 'grid', courses: 'book-open', members: 'users', moderation: 'shield', analytics: 'bar-chart-2' } as const

export default function AdminTabsLayout() {
  const { profile, ready, isDark } = useApp()
  if (ready && profile?.role !== 'admin') return <Redirect href="/" />
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#4F7EF7', tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B', tabBarStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }, tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons]} size={size} color={color} /> })}>
    <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
    <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    <Tabs.Screen name="members" options={{ title: 'Members' }} />
    <Tabs.Screen name="moderation" options={{ title: 'Moderation' }} />
    <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
  </Tabs>
}
