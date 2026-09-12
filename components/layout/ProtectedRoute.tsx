import { Redirect } from 'expo-router'
import type { PropsWithChildren } from 'react'
import type { Role } from '@/lib/types/types'
import { useApp } from '@/providers/AppProvider'
import { LoadingState } from '@/components/ui/ui'

export function ProtectedRoute({ role, children }: PropsWithChildren<{ role?: Role }>) {
  const { profile, ready } = useApp()
  if (!ready) return <LoadingState label="Checking your account…" />
  if (!profile || (role && profile.role !== role)) return <Redirect href="/" />
  return children
}
