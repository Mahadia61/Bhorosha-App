import '../global.css'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BackHandler } from 'react-native'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppProvider } from '@/providers/AppProvider'
import { useApp } from '@/providers/AppProvider'

function AppShell() {
  const { isDark } = useApp()
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!router.canGoBack()) return false
      router.back()
      return true
    })
    return () => subscription.remove()
  }, [])
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false }} /></>
}

export default function RootLayout() { return <SafeAreaProvider><AppProvider><AppShell /></AppProvider></SafeAreaProvider> }
