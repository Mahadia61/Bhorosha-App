import '../global.css'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BackHandler, View } from 'react-native'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppProvider } from '@/providers/AppProvider'
import { useApp } from '@/providers/AppProvider'
import { AppRoleActions } from '@/components/ui'

function AppShell() {
  const { isDark, profile } = useApp()
  const segments = useSegments()
  const showRoleActions = !!profile && !segments.some(segment => String(segment) === '(auth)')
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!router.canGoBack()) return false
      router.back()
      return true
    })
    return () => subscription.remove()
  }, [])
  return <View className="flex-1"><StatusBar style={isDark ? 'light' : 'dark'} /><AppRoleActions visible={showRoleActions} /><Stack screenOptions={{ headerShown: false }} /></View>
}

export default function RootLayout() { return <SafeAreaProvider><AppProvider><AppShell /></AppProvider></SafeAreaProvider> }
