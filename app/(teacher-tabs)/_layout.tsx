import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'

const icons = { dashboard: 'home', courses: 'book-open', questions: 'message-circle', feedback: 'star', insights: 'bar-chart-2' } as const

export default function TeacherTabsLayout() {
  const { profile, ready, isDark } = useApp()
  if (ready && profile?.role !== 'teacher') return <Redirect href="/" />
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#4F7EF7', tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64748B', tabBarStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF', borderTopColor: isDark ? '#1E293B' : '#E2E8F0' }, tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons]} size={size} color={color} /> })}>
    <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
    <Tabs.Screen name="courses" options={{ title: 'My courses' }} />
    <Tabs.Screen name="questions" options={{ title: 'Q&A' }} />
    <Tabs.Screen name="feedback" options={{ title: 'Feedback' }} />
    <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    <Tabs.Screen name="profile" options={{ href: null }} />
  </Tabs>
}
