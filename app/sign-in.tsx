import { useState } from 'react'
import { Alert, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Field } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function SignIn() {
  const { signIn, requestPasswordReset } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Missing details', 'Enter your email and password.')
    setLoading(true)
    try {
      const signedIn = await signIn(email, password)
      router.replace((signedIn.role === 'student' && signedIn.emailVerified === false ? '/verify-email' : signedIn.role === 'admin' ? '/(admin-tabs)/overview' : signedIn.role === 'teacher' ? '/(teacher-tabs)/dashboard' : '/(student-tabs)/home') as Href)
    } catch (reason) {
      Alert.alert('Could not sign in', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const forgotPassword = async () => {
    if (resetting) return
    if (!email.trim()) return Alert.alert('Enter your email', 'Enter your account email first, then tap Forgot password again.')
    setResetting(true)
    try {
      await requestPasswordReset(email)
      Alert.alert('Reset email sent', 'Check your inbox and follow the link to choose a new password.')
    } catch (reason) {
      Alert.alert('Could not reset password', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setResetting(false)
    }
  }

  return <SafeAreaView className="flex-1 bg-surface px-6 dark:bg-slate-950"><View className="flex-1 justify-center">
    <View className="mb-6 h-12 w-12 items-center justify-center rounded-2xl bg-brand"><Text className="text-lg font-bold text-white">B</Text></View>
    <Text className="text-3xl font-bold text-ink dark:text-white">Welcome back</Text><Text className="mt-2 text-muted">Sign in to your Bhorosha account.</Text>
    <View className="mt-8"><Field label="Email address" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="u123456@student.cuet.ac.bd" /><View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Password</Text><View className="flex-row items-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"><TextInput value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} className="flex-1 px-3.5 py-3 text-base text-ink dark:text-white" /><Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(value => !value)} className="px-3.5 py-3"><Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" /></Pressable></View></View><Text onPress={() => { void forgotPassword() }} className={`-mt-1 mb-5 self-end text-sm font-semibold text-brand ${resetting ? 'opacity-50' : ''}`}>{resetting ? 'Sending reset email…' : 'Forgot password?'}</Text><Button loading={loading} onPress={submit}>Sign in</Button></View>
    <Text className="mt-5 text-center text-xs leading-5 text-muted">Students and teachers must create an account first. Administrator accounts are provisioned separately.</Text>
  </View><Text onPress={() => router.push('/sign-up')} className="pb-6 text-center text-sm font-semibold text-brand">New student or teacher? Create an account</Text></SafeAreaView>
}
