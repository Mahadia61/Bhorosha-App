import { useState } from 'react'
import { Alert, Pressable, SafeAreaView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Field } from '@/components/ui'
import { useApp } from '@/providers/AppProvider'

type SignUpRole = 'student' | 'teacher'

const emailHint: Record<SignUpRole, string> = {
  student: 'u123456@student.cuet.ac.bd',
  teacher: 'u1001@teacher.cuet.ac.bd',
}

export default function SignUp() {
  const { signUp } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [role, setRole] = useState<SignUpRole>('student')
  const [department, setDepartment] = useState('')
  const [designation, setDesignation] = useState('')
  const [designationMenuOpen, setDesignationMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      return Alert.alert('Check your details', 'Use your full name, a CUET email, and a password with at least 8 characters.')
    }
    if (password !== confirmPassword) return Alert.alert('Passwords do not match', 'Re-enter the same password in both fields.')
    const domain = role === 'student' ? '@student.cuet.ac.bd' : '@teacher.cuet.ac.bd'
    if (!email.trim().toLowerCase().endsWith(domain)) {
      return Alert.alert('Use your CUET email', `A ${role} account requires an email ending in ${domain}.`)
    }
    if (!department.trim()) return Alert.alert('Add your department', 'For example: CSE, EEE, or ME.')
    if (role === 'teacher' && !designation) return Alert.alert('Choose your teaching position', 'Select Lecturer, Assistant Professor, Associate Professor, or Professor.')

    setLoading(true)
    try {
      const created = await signUp(name.trim(), email.trim().toLowerCase(), password, role, department.trim(), designation)
      router.replace(created.role === 'teacher' ? '/(teacher-tabs)/dashboard' : '/(student-tabs)/home')
    } catch (reason) {
      Alert.alert('Could not create account', reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <SafeAreaView className="flex-1 bg-surface px-6 dark:bg-slate-950"><View className="flex-1 justify-center">
    <Text className="text-3xl font-bold text-ink dark:text-white">Join Bhorosha</Text>
    <Text className="mt-2 text-muted">Verified CUET community feedback, built with privacy in mind.</Text>
    <View className="mt-6 flex-row gap-3">{(['student', 'teacher'] as const).map(item => <Pressable key={item} accessibilityRole="button" onPress={() => setRole(item)} className={`flex-1 rounded-xl border p-3 ${role === item ? 'border-brand bg-blue-50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800'}`}><Text className={`text-center font-semibold capitalize ${role === item ? 'text-brand' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>
    <View className="mt-6"><Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" /><Field label="CUET email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder={emailHint[role]} /><Field label="Department" autoCapitalize="characters" value={department} onChangeText={setDepartment} placeholder="CSE" />{role === 'teacher' ? <View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Teaching position</Text><Pressable accessibilityRole="button" accessibilityLabel="Choose teaching position" onPress={() => setDesignationMenuOpen(current => !current)} className="flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900"><Text className={designation ? 'text-base text-ink dark:text-white' : 'text-base text-slate-400'}>{designation || 'Select teaching position'}</Text><Feather name={designationMenuOpen ? 'chevron-up' : 'chevron-down'} color="#64748B" size={20} /></Pressable>{designationMenuOpen ? <View className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">{['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'].map(item => <Pressable key={item} accessibilityRole="menuitem" onPress={() => { setDesignation(item); setDesignationMenuOpen(false) }} className={`border-b border-slate-100 px-3.5 py-3 last:border-b-0 dark:border-slate-800 ${designation === item ? 'bg-blue-50 dark:bg-slate-800' : ''}`}><Text className={`text-sm font-medium ${designation === item ? 'text-brand' : 'text-ink dark:text-white'}`}>{item}</Text></Pressable>)}</View> : null}</View> : null}<PasswordField label="Password" value={password} onChangeText={setPassword} visible={showPassword} onToggle={() => setShowPassword(current => !current)} placeholder="At least 8 characters" /><PasswordField label="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirmation} onToggle={() => setShowConfirmation(current => !current)} placeholder="Enter the same password again" /><Button loading={loading} onPress={submit}>Create {role} account</Button></View>
  </View><Text onPress={() => router.push('/sign-in')} className="pb-6 text-center text-sm text-brand">Already have an account? Sign in</Text></SafeAreaView>
}

function PasswordField({ label, value, onChangeText, visible, onToggle, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void; placeholder: string }) {
  return <View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">{label}</Text><View className="flex-row items-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" secureTextEntry={!visible} className="flex-1 px-3.5 py-3 text-base text-ink dark:text-white" /><Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={onToggle} className="px-3.5 py-3"><Feather name={visible ? 'eye-off' : 'eye'} color="#64748B" size={20} /></Pressable></View></View>
}
