import { useRoleChrome } from '@/components/ui/useRoleChrome'
export function useNotifications() {
  const { unread, notificationHref } = useRoleChrome()
  return { unread, notificationHref }
}
