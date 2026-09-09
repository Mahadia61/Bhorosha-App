import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'

const icons = { overview: 'grid', courses: 'book-open', members: 'users', moderation: 'shield', analytics: 'bar-chart-2' } as const

export default function AdminTabsLayout() {
  const { profile, ready, isDark } = useApp()
  if (ready && profile?.role !== 'admin') return <Redirect href="/" />
  // Each redesigned admin screen owns the reference-style navigation bar so
  // it remains visually identical across the primary pages and admin tools.
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarStyle: { display: 'none' }, tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons]} size={size} color={color} /> })}>
    <Tabs.Screen name="overview" options={{ title: 'Overview' }} />
    <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    <Tabs.Screen name="members" options={{ title: 'Members' }} />
    <Tabs.Screen name="moderation" options={{ title: 'Moderation' }} />
    <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
  </Tabs>
}
