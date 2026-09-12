import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useColorScheme } from 'react-native'
import { colorScheme } from 'nativewind'
import type { AcademicLevel, AcademicTerm, Profile, Role } from '@/lib/types/types'
import { services } from '@/lib/services/services'
import { authStateWithProfile, initialAuthState } from '@/store/authStore'
import { initialThemeState, setThemeOverride } from '@/store/themeStore'

type StudentDetails = { currentLevel: AcademicLevel; currentTerm: AcademicTerm }
type AppContextValue = { profile: Profile | null; ready: boolean; isDark: boolean; signIn: (email: string, password: string) => Promise<Profile>; signUp: (name: string, email: string, password: string, role: Role, department: string, designation?: string, studentDetails?: StudentDetails) => Promise<Profile>; resendEmailVerification: () => Promise<void>; confirmEmailVerification: () => Promise<Profile>; requestPasswordReset: (email: string) => Promise<void>; changePassword: (currentPassword: string, nextPassword: string) => Promise<void>; signOut: () => Promise<void>; updateProfile: (next: Profile) => Promise<void>; setThemePreference: (darkMode: boolean) => Promise<void> }
const AppContext = createContext<AppContextValue | null>(null)
const themeKey = (userId: string) => `bhorosha-theme-${userId}`
const readStoredTheme = (userId: string) => {
  try {
    const value = globalThis.localStorage?.getItem(themeKey(userId))
    return value === 'dark' ? true : value === 'light' ? false : null
  } catch { return null }
}
const saveStoredTheme = (userId: string, darkMode: boolean) => {
  try { globalThis.localStorage?.setItem(themeKey(userId), darkMode ? 'dark' : 'light') } catch { /* Firestore remains the native persistence path. */ }
}
export function AppProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme(); const [authState, setAuthState] = useState(initialAuthState); const [themeState, setThemeState] = useState(initialThemeState)
  const { profile, ready } = authState
  const themeOverride = themeState.override
  useEffect(() => {
    const unsubscribe = services.subscribeToSession(nextProfile => { setAuthState(current => authStateWithProfile(current, nextProfile)) })
    return unsubscribe
  }, [])
  useEffect(() => { setThemeState(current => setThemeOverride(current, profile ? readStoredTheme(profile.id) : null)) }, [profile?.id])
  const isDark = themeOverride ?? profile?.darkMode ?? systemTheme === 'dark'
  useEffect(() => {
    colorScheme.set(isDark ? 'dark' : 'light')
  }, [isDark])
  const value = useMemo<AppContextValue>(() => ({
    profile, ready, isDark,
    signIn: async (email, password) => { const next = await services.signIn(email, password); setAuthState(current => authStateWithProfile(current, next)); return next },
    signUp: async (name, email, password, role, department, designation, studentDetails) => { const next = await services.signUp(name, email, password, role, department, designation, studentDetails); setAuthState(current => authStateWithProfile(current, next)); return next },
    resendEmailVerification: async () => services.resendEmailVerification(),
    confirmEmailVerification: async () => { const next = await services.confirmEmailVerification(); setAuthState(current => authStateWithProfile(current, next)); return next },
    requestPasswordReset: async email => services.requestPasswordReset(email),
    changePassword: async (currentPassword, nextPassword) => services.changePassword(currentPassword, nextPassword),
    signOut: async () => { await services.signOut(); setThemeState(current => setThemeOverride(current, null)); setAuthState(current => authStateWithProfile(current, null)) },
    updateProfile: async next => { const updated = await services.updateProfile(next); setAuthState(current => authStateWithProfile(current, updated)) },
    setThemePreference: async darkMode => {
      if (!profile) return
      // Apply immediately, then keep the choice locally while Firestore syncs.
      setThemeState(current => setThemeOverride(current, darkMode))
      setAuthState(current => current.profile ? authStateWithProfile(current, { ...current.profile, darkMode }) : current)
      saveStoredTheme(profile.id, darkMode)
      try { const updated = await services.updateProfile({ ...profile, darkMode }); setAuthState(current => authStateWithProfile(current, updated)) } catch { /* The local choice remains active; a later permitted sync can persist it. */ }
    },
  }), [profile, ready, isDark])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used inside AppProvider'); return context }
