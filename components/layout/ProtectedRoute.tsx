import { Redirect } from 'expo-router'
import type { PropsWithChildren } from 'react'
import type { Role } from '@/lib/types/types'
import { useApp } from '@/providers/AppProvider'
import { LoadingState } from '@/components/ui/ui'

export function ProtectedRoute({ role, children }: PropsWithChildren<{ role?: Role }>) {
  const { profile, ready } = useApp()
  if (!ready) return <LoadingState label="Checking your account…" />
  if (!profile || profile.active === false || (role && (profile.role !== role || (role === 'student' && profile.emailVerified !== true)))) return <Redirect href="/" />
  return children
}
