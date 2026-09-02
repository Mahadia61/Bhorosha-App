import { Stack } from 'expo-router'

/** Legacy route container retained for deep links while role-specific tab groups are used in the app. */
export default function LegacyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
