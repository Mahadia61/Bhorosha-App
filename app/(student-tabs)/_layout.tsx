import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'

const icons = { home: 'home', courses: 'book-open', professors: 'users', activity: 'clock' } as const

export default function StudentTabsLayout() {
  const { profile, ready, isDark } = useApp()
  if (ready && profile?.role !== 'student') return <Redirect href="/" />
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: '#1670F8',
    tabBarInactiveTintColor: isDark ? '#94A3B8' : '#64718B',
    tabBarStyle: {
      height: 76,
      paddingTop: 10,
      paddingBottom: 14,
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      borderTopColor: isDark ? '#1E293B' : '#E7EAF0',
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons]} size={size} color={color} />,
  })}>
    <Tabs.Screen name="home" options={{ title: 'Home' }} />
    <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    <Tabs.Screen name="professors" options={{ title: 'Teachers' }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
  </Tabs>
}
