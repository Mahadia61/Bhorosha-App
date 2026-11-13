import type { Href } from 'expo-router'
import type { Feather } from '@expo/vector-icons'
import type { Role } from '@/lib/types/types'

export const colors = {
  brand: '#1670F8',
  brandSoft: '#DCEBFF',
  ink: '#10182F',
  muted: '#64718B',
  surface: '#F5F6F8',
  border: '#E7EAF0',
  card: '#FFFFFF',
  danger: '#F04455',
  iconMuted: '#6C7890',
} as const

export type TabItem = { label: string; icon: keyof typeof Feather.glyphMap; href: Href; name: string }

export const roleTabs: Record<Exclude<Role, never>, TabItem[]> = {
  student: [
    { name: 'home', label: 'Home', icon: 'home', href: '/(student-tabs)/home' },
    { name: 'courses', label: 'Courses', icon: 'book-open', href: '/(student-tabs)/courses' },
    { name: 'professors', label: 'Teachers', icon: 'users', href: '/(student-tabs)/professors' },
    { name: 'activity', label: 'Activity', icon: 'clock', href: '/(student-tabs)/activity' },
  ],
  teacher: [
    { name: 'dashboard', label: 'Dashboard', icon: 'home', href: '/(teacher-tabs)/dashboard' },
    { name: 'courses', label: 'My Courses', icon: 'book', href: '/(teacher-tabs)/courses' },
    { name: 'questions', label: 'Q&A', icon: 'message-circle', href: '/(teacher-tabs)/questions' },
  ],
  admin: [
    { name: 'overview', label: 'Overview', icon: 'grid', href: '/(admin-tabs)/overview' },
    { name: 'courses', label: 'Courses', icon: 'book-open', href: '/(admin-tabs)/courses' },
    { name: 'members', label: 'Members', icon: 'users', href: '/(admin-tabs)/members' },
    { name: 'moderation', label: 'Moderation', icon: 'shield', href: '/(admin-tabs)/moderation' },
    { name: 'analytics', label: 'Analytics', icon: 'bar-chart-2', href: '/(admin-tabs)/analytics' },
  ],
}

export const roleRoutes = {
  student: { notifications: '/student-notifications' as Href, profile: '/(student-tabs)/profile' as Href, home: '/(student-tabs)/home' as Href },
  teacher: { notifications: '/teacher-notifications' as Href, profile: '/(teacher-tabs)/profile' as Href, home: '/(teacher-tabs)/dashboard' as Href },
  admin: { notifications: '/admin-notifications' as Href, profile: '/admin-profile' as Href, home: '/(admin-tabs)/overview' as Href },
}

export function tabBarStyle(isDark: boolean, bottomInset = 0) {
  const safeInset = Math.max(0, bottomInset)
  return {
    height: 64 + safeInset,
    paddingTop: 8,
    paddingBottom: Math.max(8, safeInset),
    minHeight: 64 + safeInset,
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderTopColor: isDark ? '#1E293B' : colors.border,
    borderTopWidth: 1,
  }
}
