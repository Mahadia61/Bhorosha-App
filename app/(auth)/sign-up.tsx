import { useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, type Href } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { Button, Field } from '@/components/ui/ui'
import { academicLevels, academicTerms } from '@/lib/utils/academic'
import type { AcademicLevel, AcademicTerm } from '@/lib/types/types'
import { useApp } from '@/providers/AppProvider'

type SignUpRole = 'student' | 'teacher'
const emailHint: Record<SignUpRole, string> = { student: 'u123456@student.cuet.ac.bd', teacher: 'name@cuet.ac.bd' }
const designations = ['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor']

export default function SignUp() {
  const { signUp } = useApp()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false); const [showConfirmation, setShowConfirmation] = useState(false); const [role, setRole] = useState<SignUpRole>('student')
  const [department, setDepartment] = useState(''); const [designation, setDesignation] = useState(''); const [designationMenuOpen, setDesignationMenuOpen] = useState(false); const [currentLevel, setCurrentLevel] = useState<AcademicLevel>('1'); const [currentTerm, setCurrentTerm] = useState<AcademicTerm>('1'); const [loading, setLoading] = useState(false); const [submitError, setSubmitError] = useState('')

  const submit = async () => {
    const fail = (title: string, message: string) => { setSubmitError(message); Alert.alert(title, message) }
    setSubmitError('')
    if (!name.trim() || !email.trim() || password.length < 8) return fail('Check your details', 'Name, CUET email, and an 8-character password are required.')
    if (password !== confirmPassword) return fail('Passwords do not match', 'Re-enter the same password in both fields.')
    const domain = role === 'student' ? '@student.cuet.ac.bd' : '@cuet.ac.bd'
    if (!email.trim().toLowerCase().endsWith(domain)) return fail('Use your CUET email', `A ${role} account requires an email ending in ${domain}.`)
    if (role === 'teacher' && !designation) return fail('Choose your teaching position', 'Select your current designation.')
    setLoading(true)
    try {
      const created = await signUp(name.trim(), email.trim().toLowerCase(), password, role, department.trim(), designation, role === 'student' ? { currentLevel, currentTerm } : undefined)
      router.replace((created.role === 'student' ? '/verify-email' : '/(teacher-tabs)/dashboard') as Href)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Account creation failed. Please try again.'
      setSubmitError(message)
      Alert.alert('Could not create account', message)
    }
    finally { setLoading(false) }
  }

  return <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950"><ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}><Text className="mt-5 text-3xl font-bold text-ink dark:text-white">Join Bhorosha</Text><Text className="mt-2 text-muted">Verified CUET community feedback, built with privacy in mind.</Text>
    <View className="mt-6 flex-row gap-3">{(['student', 'teacher'] as const).map(item => <Pressable key={item} accessibilityRole="button" onPress={() => setRole(item)} className={`flex-1 rounded-xl border p-3 ${role === item ? 'border-brand bg-blue-50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800'}`}><Text className={`text-center font-semibold capitalize ${role === item ? 'text-brand' : 'text-muted'}`}>{item}</Text></Pressable>)}</View>
    <View className="mt-6"><Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" /><Field label="CUET email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} placeholder={emailHint[role]} />
      {role === 'student' ? <><Text className="mb-4 rounded-xl bg-blue-50 px-3 py-3 text-sm text-brand dark:bg-slate-900">Student ID, batch, and department are extracted from your CUET email.</Text><OptionPicker label="Current level" options={academicLevels} value={currentLevel} onChange={setCurrentLevel} format={value => `Level ${value}`} /><OptionPicker label="Current term" options={academicTerms} value={currentTerm} onChange={setCurrentTerm} format={value => `Term ${value}`} /></> : <><Field label="Department" autoCapitalize="characters" value={department} onChangeText={setDepartment} placeholder="CSE" /><DesignationPicker value={designation} open={designationMenuOpen} onToggle={() => setDesignationMenuOpen(value => !value)} onChange={value => { setDesignation(value); setDesignationMenuOpen(false) }} /></>}
      <PasswordField label="Password" value={password} onChangeText={setPassword} visible={showPassword} onToggle={() => setShowPassword(value => !value)} placeholder="At least 8 characters" /><PasswordField label="Re-enter password" value={confirmPassword} onChangeText={setConfirmPassword} visible={showConfirmation} onToggle={() => setShowConfirmation(value => !value)} placeholder="Enter the same password again" />{submitError ? <View className="mb-4 flex-row items-center rounded-xl bg-rose-50 px-3 py-3 dark:bg-rose-950"><Feather name="alert-circle" size={18} color="#E11D48" /><Text className="ml-2 flex-1 text-sm text-rose-700 dark:text-rose-300">{submitError}</Text></View> : null}<Button loading={loading} onPress={submit}>Create {role} account</Button></View>
    <Text className="mt-5 text-center text-xs leading-5 text-muted">Students must verify their CUET email before accessing the dashboard. Teachers can sign in with their assigned CUET email without email verification.</Text><Text onPress={() => router.push('/sign-in')} className="mt-6 text-center text-sm font-semibold text-brand">Already have an account? Sign in</Text>
  </ScrollView></SafeAreaView>
}

function OptionPicker<T extends string>({ label, options, value, onChange, format = value => value }: { label: string; options: T[]; value: T; onChange: (value: T) => void; format?: (value: T) => string }) {
  return <View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">{label}</Text><View className="flex-row flex-wrap gap-2">{options.map(option => <Pressable key={option} accessibilityRole="button" onPress={() => onChange(option)} className={`rounded-xl border px-3 py-2 ${value === option ? 'border-brand bg-blue-50 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}><Text className={`text-sm font-semibold ${value === option ? 'text-brand' : 'text-muted'}`}>{format(option)}</Text></Pressable>)}</View></View>
}

function DesignationPicker({ value, open, onToggle, onChange }: { value: string; open: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return <View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">Teaching position</Text><Pressable accessibilityRole="button" onPress={onToggle} className="flex-row items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-3 dark:border-slate-700 dark:bg-slate-900"><Text className={value ? 'text-base text-ink dark:text-white' : 'text-base text-slate-400'}>{value || 'Select teaching position'}</Text><Feather name={open ? 'chevron-up' : 'chevron-down'} color="#64748B" size={20} /></Pressable>{open ? <View className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">{designations.map(option => <Pressable key={option} accessibilityRole="menuitem" onPress={() => onChange(option)} className="border-b border-slate-100 px-3.5 py-3 last:border-b-0 dark:border-slate-800"><Text className="text-sm font-medium text-ink dark:text-white">{option}</Text></Pressable>)}</View> : null}</View>
}

function PasswordField({ label, value, onChangeText, visible, onToggle, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; visible: boolean; onToggle: () => void; placeholder: string }) {
  return <View className="mb-4"><Text className="mb-1.5 text-sm font-medium text-ink dark:text-slate-100">{label}</Text><View className="flex-row items-center rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94A3B8" secureTextEntry={!visible} className="flex-1 px-3.5 py-3 text-base text-ink dark:text-white" /><Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={onToggle} className="px-3.5 py-3"><Feather name={visible ? 'eye-off' : 'eye'} color="#64748B" size={20} /></Pressable></View></View>
}
