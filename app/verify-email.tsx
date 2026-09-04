import { useEffect, useState } from 'react'
import { Alert, SafeAreaView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Button, Card } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

export default function VerifyEmail() {
  const { profile, resendEmailVerification, confirmEmailVerification, signOut } = useApp()
  const [checking, setChecking] = useState(false)
  const [sending, setSending] = useState(false)
  const isTeacher = profile?.role === 'teacher' || profile?.email.toLowerCase().endsWith('@teacher.cuet.ac.bd') === true

  useEffect(() => {
    if (isTeacher) router.replace('/(teacher-tabs)/dashboard')
  }, [isTeacher])

  if (isTeacher) return null

  const resend = async () => {
    setSending(true)
    try { await resendEmailVerification(); Alert.alert('Verification email sent', 'Open the verification link sent to your CUET email, then return here.') }
    catch (reason) { Alert.alert('Could not send email', reason instanceof Error ? reason.message : 'Please try again.') }
    finally { setSending(false) }
  }
  const confirm = async () => {
    setChecking(true)
    try {
      const verified = await confirmEmailVerification()
      router.replace(verified.role === 'teacher' ? '/(teacher-tabs)/dashboard' : '/(student-tabs)/home')
    } catch (reason) { Alert.alert('Verification pending', reason instanceof Error ? reason.message : 'Please try again.') }
    finally { setChecking(false) }
  }

  return <SafeAreaView className="flex-1 bg-surface px-6 dark:bg-slate-950"><View className="flex-1 justify-center"><Text className="text-3xl font-bold text-ink dark:text-white">Verify your CUET email</Text><Text className="mt-3 text-base leading-6 text-muted">Before you can access Bhorosha, verify the link sent to:</Text><Card className="mt-5"><Text className="font-semibold text-ink dark:text-white">{profile?.email ?? 'Your CUET email'}</Text><Text className="mt-2 text-sm leading-5 text-muted">This step protects CUET-only access. Check Inbox and Spam, open the Firebase verification link, then return to this screen.</Text></Card><Button className="mt-6" loading={checking} onPress={confirm}>I verified my email</Button><Button className="mt-3" variant="outline" loading={sending} onPress={resend}>Resend verification email</Button></View><Text onPress={() => { void signOut().then(() => router.replace('/welcome')) }} className="pb-6 text-center text-sm font-semibold text-brand">Use a different account</Text></SafeAreaView>
}
