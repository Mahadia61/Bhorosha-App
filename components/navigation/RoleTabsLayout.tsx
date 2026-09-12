import { Feather } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Role } from '@/lib/types/types'
import { useApp } from '@/providers/AppProvider'
import { colors, roleTabs, tabBarStyle } from '@/components/ui/theme'

export function RoleTabsLayout({ role, hidden = false }: { role: Role; hidden?: boolean }) {
  const { profile, ready, isDark } = useApp()
  const insets = useSafeAreaInsets()
  const icons = Object.fromEntries(roleTabs[role].map(tab => [tab.name, tab.icon])) as Record<string, keyof typeof Feather.glyphMap>
  if (ready && profile?.role !== role) return <Redirect href="/" />
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: isDark ? '#94A3B8' : colors.iconMuted,
    tabBarStyle: { ...tabBarStyle(isDark, insets.bottom), ...(hidden ? { display: 'none' } : {}) },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
    tabBarItemStyle: { paddingVertical: 1 },
    tabBarIcon: ({ color, size }) => <Feather name={icons[route.name] ?? 'circle'} size={size} color={color} />,
  })}>
    {roleTabs[role].map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />)}
    {role === 'student' ? <Tabs.Screen name="profile" options={{ href: null }} /> : null}
  </Tabs>
}
