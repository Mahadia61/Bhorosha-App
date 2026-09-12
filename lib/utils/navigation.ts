import { router } from 'expo-router'

export function goBack(fallback: Parameters<typeof router.replace>[0]) {
  if (router.canGoBack()) {
    router.back()
    return
  }
  router.replace(fallback)
}
