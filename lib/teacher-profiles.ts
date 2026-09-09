import { collection, doc, getDoc, getDocs, query, runTransaction, where } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { Course, Profile, TeacherProfile } from './types'

export const teacherIdentityIds = (profile: Pick<Profile, 'id' | 'teacherProfileId'>) => [...new Set([profile.id, profile.teacherProfileId].filter((id): id is string => Boolean(id)))]
export const teachesCourse = (course: Course, profile: Pick<Profile, 'id' | 'teacherProfileId'>) => teacherIdentityIds(profile).some(id => course.teacherIds.includes(id))
const fromRecord = (id: string, data: Record<string, unknown>): TeacherProfile => ({ id, name: String(data.name ?? ''), department: String(data.department ?? ''), designation: String(data.designation ?? ''), email: String(data.email ?? ''), linkedUserId: typeof data.linkedUserId === 'string' ? data.linkedUserId : null })

async function legacyTeacherAccounts() {
  if (!db) throw new Error('Firebase is not configured.')
  const firestore = db
  const accounts = await getDocs(query(collection(firestore, 'users'), where('role', '==', 'teacher')))
  const migrationRef = doc(firestore, 'teacherProfileMigrations', 'v1')
  const ids = await runTransaction(firestore, async transaction => {
    const migration = await transaction.get(migrationRef)
    if (migration.exists()) return migration.data().accountIds as string[]
    const accountIds = accounts.docs.map(account => account.id)
    transaction.set(migrationRef, { accountIds })
    return accountIds
  })
  const legacyIds = new Set(ids)
  return accounts.docs.filter(account => legacyIds.has(account.id))
}

// Firebase-console-provisioned credentials may not yet have an app user record.
// Call only after explicit sign-in, avoiding a race with normal signup writes.
export async function ensureTeacherAccount() {
  if (!db || !auth?.currentUser) return
  const firestore = db
  const user = auth.currentUser
  const email = user.email?.trim().toLowerCase() ?? ''
  if (!/^u\d+@teacher\.cuet\.ac\.bd$/.test(email)) return
  await runTransaction(firestore, async transaction => {
    const userRef = doc(firestore, 'users', user.uid)
    if ((await transaction.get(userRef)).exists()) return
    const reservation = await transaction.get(doc(firestore, 'teacherProfileEmails', email))
    if (!reservation.exists()) return
    const teacher = await transaction.get(doc(firestore, 'teacherProfiles', String(reservation.data().teacherProfileId)))
    if (!teacher.exists() || teacher.data().email !== email) return
    if (teacher.data().linkedUserId && teacher.data().linkedUserId !== user.uid) throw new Error('This teacher profile is already linked. Contact an administrator.')
    transaction.set(userRef, { name: teacher.data().name, department: teacher.data().department, designation: teacher.data().designation, email, role: 'teacher', active: true, emailVerified: true, darkMode: false, updatedAt: Date.now() })
  })
}

export async function linkTeacherAccount(profile: Profile): Promise<Profile> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== profile.id || profile.role !== 'teacher' || profile.active === false) return profile
  if (profile.teacherProfileId) return profile
  const email = auth.currentUser.email?.trim().toLowerCase()
  if (!email) return profile
  const reservation = await getDoc(doc(db, 'teacherProfileEmails', email))
  if (!reservation.exists()) return profile
  if (!auth.currentUser.emailVerified) return { ...profile, teacherLinkPending: true }
  const firestore = db
  const teacherProfileId = String(reservation.data().teacherProfileId)
  await runTransaction(firestore, async transaction => {
    const userRef = doc(firestore, 'users', profile.id)
    const teacherRef = doc(firestore, 'teacherProfiles', teacherProfileId)
    const legacyDirectoryRef = doc(firestore, 'teacherDirectory', profile.id)
    const [user, teacher, legacyDirectory] = await Promise.all([transaction.get(userRef), transaction.get(teacherRef), transaction.get(legacyDirectoryRef)])
    if (user.data()?.teacherProfileId === teacherProfileId && teacher.data()?.linkedUserId === profile.id) return
    if (user.data()?.teacherProfileId || !teacher.exists() || teacher.data().email !== email || teacher.data().linkedUserId) throw new Error('This teacher profile is already linked or its email has changed. Contact an administrator.')
    transaction.update(userRef, { teacherProfileId, updatedAt: Date.now() })
    transaction.update(teacherRef, { linkedUserId: profile.id })
    // A signup that preceded profile creation may have a public UID directory
    // entry. Keep its old reviews valid, but show only the canonical profile.
    if (teacherProfileId !== profile.id && legacyDirectory.exists()) transaction.update(legacyDirectoryRef, { active: false, updatedAt: Date.now() })
  })
  return { ...profile, teacherProfileId, teacherLinkPending: false }
}

export async function courseTeacherAssignments(ids: string[]) {
  if (!db) throw new Error('Firebase is not configured.')
  const firestore = db
  const teacherIds = [...new Set(ids)]
  const teachers = await Promise.all(teacherIds.map(id => getDoc(doc(firestore, 'teacherProfiles', id))))
  if (teachers.some(teacher => !teacher.exists())) throw new Error('An assigned teacher profile no longer exists. Reload the course form.')
  return { teacherIds, teacherNames: teachers.map(teacher => String(teacher.data()?.name ?? 'Teacher')) }
}

export async function saveTeacherProfile(input: Omit<TeacherProfile, 'id' | 'linkedUserId'>, id?: string, legacyAccount?: Profile): Promise<TeacherProfile> {
  if (!db) throw new Error('Firebase is not configured.')
  const firestore = db
  const value = { name: input.name.trim(), department: input.department.trim().toUpperCase(), designation: input.designation.trim(), email: input.email.trim().toLowerCase() }
  if (!value.name || value.name.length > 100 || !value.department || value.department.length > 24) throw new Error('Enter a full name (up to 100 characters) and department (up to 24 characters).')
  if (!['Lecturer', 'Assistant Professor', 'Associate Professor', 'Professor'].includes(value.designation)) throw new Error('Choose a teaching designation.')
  if (value.email.length > 254 || (value.email && !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(value.email))) throw new Error('Enter a valid email address, or leave it empty.')
  // Freeze the compatibility cohort before creating the first independent
  // profile. Later signups must not create duplicates of email-less profiles.
  if (!id && !legacyAccount) await legacyTeacherAccounts()
  const ref = id ? doc(firestore, 'teacherProfiles', id) : doc(collection(firestore, 'teacherProfiles'))
  return runTransaction(firestore, async transaction => {
    const existing = await transaction.get(ref)
    // Import is idempotent and must never overwrite an administrator's edits.
    if (legacyAccount && existing.exists()) return fromRecord(ref.id, existing.data())
    const previous = existing.exists() ? fromRecord(ref.id, existing.data()) : null
    if (previous?.linkedUserId && previous.email !== value.email) throw new Error('The email of a linked teacher cannot be changed here.')
    const emailRef = value.email ? doc(firestore, 'teacherProfileEmails', value.email) : null
    const reserved = emailRef ? await transaction.get(emailRef) : null
    if (reserved?.exists() && reserved.data().teacherProfileId !== ref.id) throw new Error('A teacher profile already uses this email. Edit that profile instead.')
    const linkedUserId = previous?.linkedUserId ?? legacyAccount?.id ?? null
    if (previous?.email && previous.email !== value.email) transaction.delete(doc(firestore, 'teacherProfileEmails', previous.email))
    if (emailRef) transaction.set(emailRef, { teacherProfileId: ref.id })
    transaction.set(ref, { ...value, linkedUserId })
    transaction.set(doc(firestore, 'teacherDirectory', ref.id), { name: value.name, department: value.department, designation: value.designation, ...(!existing.exists() ? { bio: legacyAccount?.bio ?? '', photoUrl: legacyAccount?.photoUrl ?? '' } : {}), active: true, updatedAt: Date.now() }, { merge: true })
    if (legacyAccount) transaction.update(doc(firestore, 'users', legacyAccount.id), { teacherProfileId: ref.id, updatedAt: Date.now() })
    return { id: ref.id, ...value, linkedUserId }
  })
}

export async function adminTeacherProfiles(): Promise<TeacherProfile[]> {
  if (!db) throw new Error('Firebase is not configured.')
  const firestore = db
  const [teachers, accounts] = await Promise.all([getDocs(collection(firestore, 'teacherProfiles')), legacyTeacherAccounts()])
  const profiles = teachers.docs.map(item => fromRecord(item.id, item.data()))
  for (const account of accounts) {
    const data = account.data()
    if (profiles.some(teacher => teacher.id === account.id || teacher.linkedUserId === account.id || (teacher.email && teacher.email === String(data.email).toLowerCase()))) continue
    const legacy = { id: account.id, ...data } as Profile
    profiles.push(await saveTeacherProfile({ name: legacy.name, department: legacy.department, designation: legacy.designation ?? 'Lecturer', email: legacy.email }, account.id, legacy))
  }
  return profiles.sort((a, b) => a.name.localeCompare(b.name))
}

// Read-only directory for the member-management screen. Unlike the migration
// helper above, this never creates or changes a teacher account.
export async function teacherProfiles(): Promise<TeacherProfile[]> {
  if (!db) throw new Error('Firebase is not configured.')
  const snapshot = await getDocs(collection(db, 'teacherProfiles'))
  return snapshot.docs.map(item => fromRecord(item.id, item.data())).sort((a, b) => a.name.localeCompare(b.name))
}
