import { useEffect, useState } from 'react'
import { services } from '@/lib/services/services'
import { useApp } from '@/providers/AppProvider'
import { roleRoutes, roleTabs, type TabItem } from './theme'
import type { Href } from 'expo-router'
import type { Role } from '@/lib/types/types'

export function useRoleChrome(role?: Role) {
  const { profile, isDark } = useApp()
  const resolved: Role = role ?? profile?.role ?? 'student'
  const routes = roleRoutes[resolved]
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!profile) return
    if (resolved === 'admin') {
      return services.subscribeAdminNotifications(items => setUnread(items.filter(item => !item.read).length), () => setUnread(0))
    }
    if (resolved === 'teacher') {
      return services.subscribeTeacherNotifications(profile.id, items => setUnread(items.filter(item => !item.read).length), () => setUnread(0))
    }
    void services.questionNotifications(profile.id).then(items => setUnread(items.filter(item => !item.read).length)).catch(() => setUnread(0))
  }, [profile?.id, resolved])

  return {
    profile,
    isDark,
    role: resolved,
    unread,
    initial: profile?.name.trim().charAt(0).toUpperCase() || resolved.charAt(0).toUpperCase(),
    photoUrl: profile?.photoUrl,
    notificationHref: routes.notifications,
    profileHref: routes.profile,
    homeHref: routes.home,
    tabs: roleTabs[resolved] as TabItem[],
  }
}

export function useNotificationHref(): Href {
  return useRoleChrome().notificationHref
}
