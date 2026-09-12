import { useApp } from '@/providers/AppProvider'
export function useAuth() {
  const { profile, ready, signIn, signUp, signOut, requestPasswordReset, changePassword } = useApp()
  return { profile, ready, isAuthenticated: Boolean(profile), signIn, signUp, signOut, requestPasswordReset, changePassword }
}
