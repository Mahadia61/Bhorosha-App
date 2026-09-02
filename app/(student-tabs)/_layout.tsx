import { Tabs, Redirect } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useApp } from '@/providers/AppProvider'

const icons = { home: 'home', courses: 'book-open', professors: 'users', activity: 'clock', profile: 'user' } as const

export default function StudentTabsLayout() {
  const { profile, ready } = useApp()
  if (ready && profile?.role !== 'student') return <Redirect href="/" />
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#4F7EF7', tabBarInactiveTintColor: '#64748B', tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons]} size={size} color={color} /> })}>
    <Tabs.Screen name="home" options={{ title: 'Home' }} />
    <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    <Tabs.Screen name="professors" options={{ title: 'Teachers' }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>
}
