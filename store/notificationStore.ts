export type NotificationState = { unread: number }
export const initialNotificationState: NotificationState = { unread: 0 }
export function setUnreadCount(state: NotificationState, unread: number): NotificationState {
  return { ...state, unread: Math.max(0, unread) }
}
