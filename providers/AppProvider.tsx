import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useColorScheme } from 'react-native'
import { colorScheme } from 'nativewind'
import type { AcademicLevel, AcademicTerm, Profile, Role } from '@/lib/types'
import { services } from '@/lib/services'

type StudentDetails = { batch: string; studentId: string; currentLevel: AcademicLevel; currentTerm: AcademicTerm }
type AppContextValue = { profile: Profile | null; ready: boolean; isDark: boolean; signIn: (email: string, password: string) => Promise<Profile>; signUp: (name: string, email: string, password: string, role: Role, department: string, designation?: string, studentDetails?: StudentDetails) => Promise<Profile>; resendEmailVerification: () => Promise<void>; confirmEmailVerification: () => Promise<Profile>; requestPasswordReset: (email: string) => Promise<void>; changePassword: (currentPassword: string, nextPassword: string) => Promise<void>; signOut: () => Promise<void>; updateProfile: (next: Profile) => Promise<void> }
const AppContext = createContext<AppContextValue | null>(null)
export function AppProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme(); const [profile, setProfile] = useState<Profile | null>(null); const [ready, setReady] = useState(false)
  useEffect(() => {
    const unsubscribe = services.subscribeToSession(nextProfile => { setProfile(nextProfile); setReady(true) })
    return unsubscribe
  }, [])
  useEffect(() => {
    colorScheme.set(profile?.darkMode ? 'dark' : systemTheme === 'dark' && !profile ? 'dark' : 'light')
  }, [profile?.darkMode, profile, systemTheme])
  const value = useMemo<AppContextValue>(() => ({
    profile, ready, isDark: profile?.darkMode ?? systemTheme === 'dark',
    signIn: async (email, password) => { const next = await services.signIn(email, password); setProfile(next); return next },
    signUp: async (name, email, password, role, department, designation, studentDetails) => { const next = await services.signUp(name, email, password, role, department, designation, studentDetails); setProfile(next); return next },
    resendEmailVerification: async () => services.resendEmailVerification(),
    confirmEmailVerification: async () => { const next = await services.confirmEmailVerification(); setProfile(next); return next },
    requestPasswordReset: async email => services.requestPasswordReset(email),
    changePassword: async (currentPassword, nextPassword) => services.changePassword(currentPassword, nextPassword),
    signOut: async () => { await services.signOut(); setProfile(null) },
    updateProfile: async next => setProfile(await services.updateProfile(next)),
  }), [profile, ready, systemTheme])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used inside AppProvider'); return context }
