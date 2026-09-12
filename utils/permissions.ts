import type { Profile, Role } from '@/lib/types/types'

export function hasRole(profile: Profile | null | undefined, role: Role): boolean {
  return profile?.role === role
}

export function canModerate(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin'
}

export function canManageUsers(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin'
}

export function canManageCourses(profile: Profile | null | undefined): boolean {
  return profile?.role === 'admin'
}

export function canAnswerQuestions(profile: Profile | null | undefined): boolean {
  return profile?.role === 'teacher' || profile?.role === 'admin'
}

export function canSubmitCommunityContent(profile: Profile | null | undefined): boolean {
  return profile?.role === 'student'
}
