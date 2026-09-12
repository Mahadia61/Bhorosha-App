import type { Profile } from '@/lib/types/types'

export type AuthState = { profile: Profile | null; ready: boolean }
export const initialAuthState: AuthState = { profile: null, ready: false }
export function authStateWithProfile(state: AuthState, profile: Profile | null): AuthState {
  return { ...state, profile, ready: true }
}
