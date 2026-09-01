import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { useColorScheme } from 'react-native'
import type { Profile, Role } from '@/lib/types'
import { services } from '@/lib/services'

type AppContextValue = { profile: Profile | null; ready: boolean; isDark: boolean; signIn: (email: string, password: string) => Promise<void>; signUp: (name: string, email: string, password: string, role: Role, department: string) => Promise<void>; signOut: () => Promise<void>; updateProfile: (next: Profile) => Promise<void> }
const AppContext = createContext<AppContextValue | null>(null)
export function AppProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme(); const [profile, setProfile] = useState<Profile | null>(null); const [ready, setReady] = useState(false)
  useEffect(() => { services.session().then(setProfile).finally(() => setReady(true)) }, [])
  const value = useMemo<AppContextValue>(() => ({
    profile, ready, isDark: profile?.darkMode ?? systemTheme === 'dark',
    signIn: async (email, password) => setProfile(await services.signIn(email, password)),
    signUp: async (name, email, password, role, department) => setProfile(await services.signUp(name, email, password, role, department)),
    signOut: async () => { await services.signOut(); setProfile(null) },
    updateProfile: async next => setProfile(await services.updateProfile(next)),
  }), [profile, ready, systemTheme])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
export const useApp = () => { const context = useContext(AppContext); if (!context) throw new Error('useApp must be used inside AppProvider'); return context }
