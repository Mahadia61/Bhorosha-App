import { useApp } from '@/providers/AppProvider'
export function useUser() {
  const { profile, updateProfile, isDark, setThemePreference } = useApp()
  return { profile, updateProfile, isDark, setThemePreference }
}
