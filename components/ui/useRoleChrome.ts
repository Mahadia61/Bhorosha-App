import { useEffect, useState } from 'react'
import { services } from '@/lib/services/services'
import { useApp } from '@/providers/AppProvider'
import { roleRoutes, roleTabs, type TabItem } from './theme'
import type { Href } from 'expo-router'
import type { AppNotification, Role } from '@/lib/types/types'

export function useRoleChrome(role?: Role) {
  const { profile, isDark } = useApp()
  const resolved: Role = role ?? profile?.role ?? 'student'
  const routes = roleRoutes[resolved]
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notificationsError, setNotificationsError] = useState('')

  useEffect(() => {
    if (!profile) {
      setNotifications([])
      setUnread(0)
      setNotificationsError('')
      return
    }
    const updateNotifications = (items: AppNotification[]) => {
      setNotifications(items)
      setUnread(items.filter(item => !item.read).length)
      setNotificationsError('')
    }
    const handleError = (reason: Error) => {
      setNotifications([])
      setUnread(0)
      setNotificationsError(reason.message)
    }
    if (resolved === 'admin') {
      return services.subscribeAdminNotifications(updateNotifications, handleError)
    }
    if (resolved === 'teacher') {
      return services.subscribeTeacherNotifications(profile.id, updateNotifications, handleError)
    }
    return services.subscribeStudentNotifications(profile.id, updateNotifications, handleError)
  }, [profile?.id, resolved])

  const markNotificationRead = async (item: AppNotification) => {
    if (item.read) return
    if (resolved === 'admin') await services.markAdminNotificationRead(item.id)
    else if (resolved === 'teacher') await services.markTeacherNotificationRead(item.id)
    else await services.markQuestionNotificationRead(item.id)
    setNotifications(current => current.map(notification =>
      notification.id === item.id ? { ...notification, read: true } : notification,
    ))
    setUnread(current => Math.max(0, current - 1))
  }

  return {
    profile,
    isDark,
    role: resolved,
    unread,
    notifications,
    notificationsError,
    markNotificationRead,
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
