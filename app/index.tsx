import { Redirect } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useApp } from '@/providers/AppProvider'
export default function Index() { const { ready, profile } = useApp(); if (!ready) return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>; return <Redirect href={profile ? profile.role === 'admin' ? '/(admin-tabs)/overview' : profile.role === 'teacher' ? '/(teacher-tabs)/dashboard' : '/(student-tabs)/home' : '/welcome'} /> }
