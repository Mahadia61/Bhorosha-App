import type { PropsWithChildren } from 'react'
import { ProtectedRoute } from './ProtectedRoute'
import type { Role } from '@/lib/types/types'

function RoleLayout({ role, children }: PropsWithChildren<{ role: Role }>) {
  return <ProtectedRoute role={role}>{children}</ProtectedRoute>
}
export function StudentLayout({ children }: PropsWithChildren) { return <RoleLayout role="student">{children}</RoleLayout> }
export function TeacherLayout({ children }: PropsWithChildren) { return <RoleLayout role="teacher">{children}</RoleLayout> }
export function AdminLayout({ children }: PropsWithChildren) { return <RoleLayout role="admin">{children}</RoleLayout> }
