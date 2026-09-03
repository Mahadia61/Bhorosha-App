import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AppProvider } from '@/providers/AppProvider'
import { useApp } from '@/providers/AppProvider'

function AppShell() {
  const { isDark } = useApp()
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false }} /></>
}

export default function RootLayout() { return <AppProvider><AppShell /></AppProvider> }
