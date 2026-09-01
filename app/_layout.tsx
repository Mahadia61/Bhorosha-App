import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AppProvider } from '@/providers/AppProvider'
export default function RootLayout() { return <AppProvider><StatusBar style="auto" /><Stack screenOptions={{ headerShown: false }} /></AppProvider> }
