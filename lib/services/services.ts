import { EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, where, writeBatch, type Unsubscribe } from 'firebase/firestore'
import { auth, db, firebaseEnabled } from '../firebase/firebase'
import { sanitizeCommunityText } from '../utils/content-filter'
import { adminTeacherProfiles, courseTeacherAssignments, ensureTeacherAccount, linkTeacherAccount, saveTeacherProfile, teacherIdentityIds, teacherProfiles, teachesCourse } from './teacher-profiles'
import type { AcademicLevel, AcademicTerm, ActivityItem, AppNotification, AppNotificationCategory, ContentType, Course, CourseGuide, CourseInstance, CourseQuestion, CourseStatus, CourseType, ModerationAppeal, ModerationHistoryItem, Professor, ProfessorReview, Profile, QuestionAnswer, QuestionCategory, RatingMap, Report, ReportAction, ReportReason, Review, Role, TeacherResponse } from '../types/types'

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isStudentEmail = (email: string) => /^u\d+@student\.cuet\.ac\.bd$/.test(email)
const isTeacherEmail = (email: string) => /^[^@\s]+@cuet\.ac\.bd$/.test(email)
const studentDepartments: Record<string, string> = { '01': 'CE', '02': 'EEE', '03': 'ME', '04': 'CSE', '05': 'ETE', '06': 'MME', '07': 'MIE', '08': 'MSE', '09': 'PME', '10': 'Architecture' }
function studentIdentity(email: string) {
  const match = /^u(\d{7})@student\.cuet\.ac\.bd$/.exec(email)
  if (!match) throw new Error('Use a CUET student email such as u2204061@student.cuet.ac.bd.')
  const digits = match[1]
  const department = studentDepartments[digits.slice(2, 4)]
  if (!department) throw new Error('Your CUET email contains an unsupported department code.')
  return { studentId: digits, batch: String(2000 + Number(digits.slice(0, 2))), department }
}
function academicPosition(level: string | null | undefined, term: string | null | undefined) {
  if (!level || !term) return null
  const parsedLevel = Number(level)
  const parsedTerm = Number(term)
  return Number.isInteger(parsedLevel) && Number.isInteger(parsedTerm) && parsedLevel >= 1 && parsedLevel <= 4 && parsedTerm >= 1 && parsedTerm <= 2
    ? (parsedLevel - 1) * 2 + parsedTerm
    : null
}
const backendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''
const QUERY_LIMITS = { courses: 100, reviews: 50, questions: 50, guides: 50, notifications: 100, moderation: 100 } as const
const legacyInstanceId = (courseId: string) => `${courseId}--legacy`

function adminNotificationCategory(data: Record<string, unknown>): AppNotificationCategory {
  const category = data.category
  if (category === 'reports' || category === 'users' || category === 'courses' || category === 'system') return category
  const title = `${String(data.title ?? '')} ${String(data.body ?? '')}`.toLowerCase()
  if (title.includes('report') || title.includes('moder')) return 'reports'
  if (title.includes('user') || title.includes('teacher') || title.includes('student') || title.includes('verification')) return 'users'
  if (title.includes('course')) return 'courses'
  return 'system'
}

function firebaseSignupError(reason: unknown) {
  const code = typeof reason === 'object' && reason !== null && 'code' in reason ? String(reason.code) : ''
  if (code.includes('auth/email-already-in-use')) return new Error('This email already has an account. Sign in instead or use a different CUET email.')
  if (code.includes('auth/operation-not-allowed')) return new Error('Email/password sign-up is disabled in Firebase Authentication. Enable it in Firebase Console > Authentication > Sign-in method.')
  if (code.includes('auth/invalid-email')) return new Error('Enter a valid CUET email address.')
  if (code.includes('auth/weak-password')) return new Error('Use a stronger password with at least 8 characters.')
  if (code.includes('permission-denied')) return new Error('Firebase rejected the profile write. Confirm the email is a CUET student address (u<number>@student.cuet.ac.bd), then deploy the current Firestore rules.')
  if (code.includes('auth/network-request-failed')) return new Error('Firebase could not connect. Check your internet connection and Firebase configuration.')
  return reason instanceof Error ? reason : new Error('Account creation failed. Please try again.')
}

function requireFirebase() {
  if (!firebaseEnabled || !auth || !db) throw new Error('Firebase is not configured. Copy .env.example to .env and add your Firebase web app values.')
  return { auth, db }
}

const profileFrom = (id: string, data: Record<string, unknown>): Profile => ({
  id,
  teacherProfileId: typeof data.teacherProfileId === 'string' ? data.teacherProfileId : undefined,
  name: String(data.name ?? ''),
  email: String(data.email ?? ''),
  role: data.role as Role,
  department: String(data.department ?? ''),
  designation: data.designation ? String(data.designation) : undefined,
  bio: data.bio ? String(data.bio) : undefined,
  photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
  darkMode: Boolean(data.darkMode),
  active: data.active !== false,
  // Administrators are provisioned through trusted Firebase tooling, not the
  // public sign-up route. Their profile record carries this flag at bootstrap.
  emailVerified: data.role === 'admin' || data.role === 'teacher' ? true : data.emailVerified === true,
  batch: data.batch ? String(data.batch) : undefined,
  studentId: data.studentId ? String(data.studentId) : undefined,
  currentLevel: ['1', '2', '3', '4'].includes(String(data.currentLevel)) ? String(data.currentLevel) as AcademicLevel : undefined,
  currentTerm: ['1', '2'].includes(String(data.currentTerm)) ? String(data.currentTerm) as AcademicTerm : undefined,
  warningCount: Number(data.warningCount ?? 0),
  createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
})

const directoryFrom = (profile: Profile): Record<string, unknown> => ({
  name: profile.name,
  department: profile.department,
  designation: profile.designation ?? '',
  photoUrl: profile.photoUrl ?? '',
  bio: profile.bio ?? '',
  active: profile.active !== false,
  updatedAt: Date.now(),
})

const courseFrom = (id: string, data: Record<string, unknown>): Course => ({
  id,
  code: String(data.code ?? ''),
  title: String(data.title ?? ''),
  credits: Number(data.credits ?? 0),
  level: ['1', '2', '3', '4'].includes(String(data.level)) ? String(data.level) as AcademicLevel : null,
  term: ['1', '2'].includes(String(data.term)) ? String(data.term) as AcademicTerm : null,
  courseType: ['Theory', 'Lab', 'Project', 'Sessional', 'Other'].includes(String(data.courseType)) ? String(data.courseType) as CourseType : null,
  department: String(data.department ?? ''),
  batch: typeof data.batch === 'string' ? data.batch : undefined,
  teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds.map(String) : [],
  teacherNames: Array.isArray(data.teacherNames) ? data.teacherNames.map(String) : [],
  tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
  status: ['active', 'archived', 'draft'].includes(String(data.status)) ? String(data.status) as CourseStatus : 'active',
})

const normalizeCourseRatings = (ratings: RatingMap): RatingMap => Object.fromEntries(
  Object.entries(defaultRatings).map(([key, fallback]) => [
    key,
    Math.max(1, Math.min(5, Math.round(Number(ratings[key as keyof RatingMap] ?? fallback)))),
  ]),
) as RatingMap

const reviewFrom = (id: string, data: Record<string, unknown>): Review => {
  const storedRatings = (data.ratings ?? {}) as Record<string, unknown>
  const rating = (key: keyof RatingMap, fallback: number) => Number(storedRatings[key] ?? fallback)
  return {
  id, courseId: String(data.courseId ?? ''), ...(typeof data.courseInstanceId === 'string' ? { courseInstanceId: data.courseInstanceId } : {}), text: String(data.text ?? ''), ratings: {
    teachingQuality: rating('teachingQuality', 0), workload: rating('workload', 0), gradingFairness: rating('gradingFairness', 0), courseStructure: rating('courseStructure', 0), availability: rating('availability', 0), difficulty: rating('difficulty', 0), learningValue: rating('learningValue', 0),
  },
  anonymous: data.anonymous !== false, displayName: typeof data.displayName === 'string' ? data.displayName : null, createdAt: Number(data.createdAt ?? 0), updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
}}

const professorReviewFrom = (id: string, data: Record<string, unknown>): ProfessorReview => ({
  id, professorId: String(data.professorId ?? ''), text: String(data.text ?? ''), rating: Number(data.rating ?? 0),
  aspects: data.aspects && typeof data.aspects === 'object' ? Object.fromEntries(Object.entries(data.aspects as Record<string, unknown>).map(([key, value]) => [key, Number(value)])) : undefined,
  tags: Array.isArray(data.tags) ? data.tags.map(String) : undefined,
  anonymous: data.anonymous !== false, displayName: typeof data.displayName === 'string' ? data.displayName : null, createdAt: Number(data.createdAt ?? 0),
})

const answerFrom = (id: string, data: Record<string, unknown>): QuestionAnswer => ({
  id, ...(typeof data.questionId === 'string' ? { questionId: data.questionId } : {}), ...(typeof data.courseId === 'string' ? { courseId: data.courseId } : {}), ...(typeof data.courseInstanceId === 'string' ? { courseInstanceId: data.courseInstanceId } : {}), authorName: String(data.authorName ?? 'A student'), authorRole: data.authorRole === 'teacher' ? 'teacher' : 'student', text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0),
})

const questionFrom = (id: string, data: Record<string, unknown>): CourseQuestion => ({
  id, courseId: String(data.courseId ?? ''), ...(typeof data.courseInstanceId === 'string' ? { courseInstanceId: data.courseInstanceId } : {}), category: ['Course Content', 'Course Related', 'Exam', 'Assignment', 'Project', 'Registration', 'Academic', 'Advising', 'Other'].includes(String(data.category)) ? String(data.category) as QuestionCategory : 'Other', text: String(data.text ?? ''), anonymous: data.anonymous !== false, createdAt: Number(data.createdAt ?? 0), answers: [],
})

const activityFrom = (id: string, data: Record<string, unknown>): ActivityItem => ({
  id, kind: data.kind as ActivityItem['kind'], targetId: String(data.targetId ?? ''), text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0),
  ...(typeof data.courseId === 'string' ? { courseId: data.courseId } : {}),
  ...(typeof data.professorId === 'string' ? { professorId: data.professorId } : {}),
  ...(typeof data.questionId === 'string' ? { questionId: data.questionId } : {}),
})

const reportFrom = (id: string, data: Record<string, unknown>): Report => ({
  id,
  contentType: data.contentType as ContentType,
  contentId: String(data.contentId ?? ''),
  ...(typeof data.courseInstanceId === 'string' ? { courseInstanceId: data.courseInstanceId } : {}),
  ...(typeof data.questionId === 'string' ? { questionId: data.questionId } : {}),
  reporterId: String(data.reporterId ?? data.reportedBy ?? ''),
  reporterRole: (data.reporterRole === 'teacher' || data.reporterRole === 'admin' ? data.reporterRole : 'student') as Role,
  reportedUserId: String(data.reportedUserId ?? ''),
  reason: (data.reason ?? data.category) as ReportReason,
  category: (data.category ?? data.reason) as ReportReason,
  description: String(data.description ?? ''),
  status: data.status === 'resolved' || data.status === 'reviewed' || data.status === 'removed' || data.status === 'hidden' || data.status === 'kept' || data.status === 'warned' ? 'resolved' : 'pending',
  ...(typeof data.action === 'string' ? { action: data.action as ReportAction } : data.status === 'removed' ? { action: 'removed' } : data.status === 'warned' ? { action: 'warned' } : data.status === 'kept' ? { action: 'kept' } : {}),
  createdAt: Number(data.createdAt ?? 0),
  ...(typeof data.resolvedAt === 'number' ? { resolvedAt: data.resolvedAt } : {}),
})

async function firebaseProfile(userId: string): Promise<Profile | null> {
  const { db: firestore } = requireFirebase()
  const snapshot = await getDoc(doc(firestore, 'users', userId))
  return snapshot.exists() ? profileFrom(snapshot.id, snapshot.data()) : null
}

async function authenticatedProfile(userId: string, emailVerified: boolean): Promise<Profile | null> {
  const profile = await firebaseProfile(userId)
  if (profile?.role === 'teacher') return linkTeacherAccount(profile)
  if (!profile || profile.role !== 'student') return profile
  return { ...profile, emailVerified }
}

async function firebaseAnswers(questionId: string): Promise<QuestionAnswer[]> {
  const { db: firestore } = requireFirebase()
  const snapshot = await getDocs(query(collection(firestore, 'courseQuestions', questionId, 'answers'), orderBy('createdAt', 'asc')))
  return snapshot.docs.map(item => answerFrom(item.id, item.data()))
}

async function firebaseTeacherResponses(reviewId: string): Promise<TeacherResponse[]> {
  const { db: firestore } = requireFirebase()
  const snapshot = await getDocs(query(collection(firestore, 'courseReviews', reviewId, 'teacherResponses'), orderBy('createdAt', 'asc')))
  return snapshot.docs.map(item => ({ id: item.id, teacherName: String(item.data().teacherName ?? 'Course teacher'), text: String(item.data().text ?? ''), createdAt: Number(item.data().createdAt ?? 0) }))
}

async function firebaseProfessorResponses(reviewId: string): Promise<TeacherResponse[]> {
  const { db: firestore } = requireFirebase()
  const snapshot = await getDocs(query(collection(firestore, 'professorReviews', reviewId, 'teacherResponses'), orderBy('createdAt', 'asc')))
  return snapshot.docs.map(item => ({ id: item.id, teacherName: String(item.data().teacherName ?? 'Teacher'), text: String(item.data().text ?? ''), createdAt: Number(item.data().createdAt ?? 0) }))
}

async function firebaseQuestions(snapshot: Awaited<ReturnType<typeof getDocs>>): Promise<CourseQuestion[]> {
  return Promise.all(snapshot.docs.map(async item => ({ ...questionFrom(item.id, item.data() as Record<string, unknown>), answers: await firebaseAnswers(item.id) })))
}

async function saveActivity(userId: string, id: string, data: Omit<ActivityItem, 'id'>) {
  const { db: firestore } = requireFirebase()
  await setDoc(doc(firestore, 'users', userId, 'activity', id), data)
}

export const services = {
  firebaseEnabled,
  adminTeacherProfiles,
  teacherProfiles,
  saveTeacherProfile,

  async courseInstances(courseId?: string): Promise<CourseInstance[]> {
    const { db: firestore } = requireFirebase()
    const source = courseId
      ? query(collection(firestore, 'courseInstances'), where('courseId', '==', courseId), limit(QUERY_LIMITS.courses))
      : query(collection(firestore, 'courseInstances'), limit(QUERY_LIMITS.courses))
    const snapshot = await getDocs(source)
    return snapshot.docs.map(item => {
      const data = item.data()
      return {
        id: item.id,
        courseId: String(data.courseId ?? ''),
        ...(typeof data.batch === 'string' ? { batch: data.batch } : {}),
        department: String(data.department ?? ''),
        level: ['1', '2', '3', '4'].includes(String(data.level)) ? String(data.level) as AcademicLevel : null,
        term: ['1', '2'].includes(String(data.term)) ? String(data.term) as AcademicTerm : null,
        teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds.map(String) : [],
        teacherNames: Array.isArray(data.teacherNames) ? data.teacherNames.map(String) : [],
        legacy: data.legacy === true,
        ...(typeof data.createdAt === 'number' ? { createdAt: data.createdAt } : {}),
        ...(typeof data.updatedAt === 'number' ? { updatedAt: data.updatedAt } : {}),
      }
    })
  },

  async legacyCourseInstance(course: Course): Promise<CourseInstance | null> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDoc(doc(firestore, 'courseInstances', legacyInstanceId(course.id)))
    if (snapshot.exists()) {
      const data = snapshot.data()
      return { id: snapshot.id, courseId: course.id, batch: typeof data.batch === 'string' ? data.batch : undefined, department: String(data.department ?? course.department), level: course.level, term: course.term, teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds.map(String) : course.teacherIds, teacherNames: Array.isArray(data.teacherNames) ? data.teacherNames.map(String) : course.teacherNames, legacy: data.legacy === true }
    }
    return null
  },

  subscribeToSession(callback: (profile: Profile | null) => void) {
    if (!firebaseEnabled || !auth || !db) { callback(null); return () => undefined }
    const firestore = db
    let stopProfile: Unsubscribe | undefined
    let generation = 0
    const stopAuth = onAuthStateChanged(auth, user => {
      stopProfile?.()
      generation += 1
      if (!user) { callback(null); return }
      stopProfile = onSnapshot(doc(firestore, 'users', user.uid), () => {
        const current = ++generation
        void authenticatedProfile(user.uid, user.emailVerified).then(profile => { if (current === generation) callback(profile) }).catch(() => { if (current === generation) callback(null) })
      }, () => callback(null))
    })
    return () => { generation += 1; stopProfile?.(); stopAuth() }
  },

  async session(): Promise<Profile | null> {
    if (!firebaseEnabled || !auth?.currentUser) return null
    return authenticatedProfile(auth.currentUser.uid, auth.currentUser.emailVerified)
  },

  async signUp(name: string, email: string, password: string, role: Role, department: string, designation?: string, studentDetails?: { currentLevel: AcademicLevel; currentTerm: AcademicTerm }): Promise<Profile> {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    const normalized = normalizeEmail(email)
    const identity = role === 'student' ? studentIdentity(normalized) : null
    const normalizedDepartment = identity?.department ?? department.trim().toUpperCase()
    if (role === 'admin') throw new Error('Administrator accounts are provisioned separately.')
    if (!name.trim() || !normalizedDepartment) throw new Error('Enter your full name and department.')
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
    if (role === 'student' && !isStudentEmail(normalized)) throw new Error('Use u{ID}@student.cuet.ac.bd for a student account.')
    if (role === 'teacher' && !isTeacherEmail(normalized)) throw new Error('Use name@cuet.ac.bd for a teacher account.')
    if (role === 'teacher' && !designation?.trim()) throw new Error('Choose your teaching position.')
    if (role === 'student' && (!studentDetails?.currentLevel || !studentDetails.currentTerm)) throw new Error('Select your current academic level and term.')

    let credential
    try {
      credential = await createUserWithEmailAndPassword(firebaseAuth, normalized, password)
    } catch (reason) {
      throw firebaseSignupError(reason)
    }
    const requiresEmailVerification = role === 'student'
    const profile: Profile = { id: credential.user.uid, name: name.trim(), email: normalized, role, department: normalizedDepartment, designation: role === 'teacher' ? designation?.trim() : undefined, darkMode: false, active: !requiresEmailVerification, emailVerified: !requiresEmailVerification, ...(role === 'student' && studentDetails && identity ? { batch: identity.batch, studentId: identity.studentId, currentLevel: studentDetails.currentLevel, currentTerm: studentDetails.currentTerm } : {}) }
    const profileRecord = {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      darkMode: false,
      active: profile.active,
      emailVerified: profile.emailVerified,
      updatedAt: Date.now(),
      ...(profile.designation ? { designation: profile.designation } : {}),
      ...(profile.batch ? { batch: profile.batch } : {}),
      ...(profile.studentId ? { studentId: profile.studentId } : {}),
      ...(profile.currentLevel ? { currentLevel: profile.currentLevel } : {}),
      ...(profile.currentTerm ? { currentTerm: profile.currentTerm } : {}),
    }
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'users', profile.id), profileRecord)
    try {
      await batch.commit()
    } catch (reason) {
      // A rejected profile write must not strand a reusable email address in
      // Firebase Authentication without its required Firestore profile.
      await deleteUser(credential.user).catch(() => undefined)
      await firebaseSignOut(firebaseAuth).catch(() => undefined)
      throw firebaseSignupError(reason)
    }
    if (role === 'teacher') {
      const linked = await linkTeacherAccount(profile)
      if (!linked.teacherProfileId && !linked.teacherLinkPending) await setDoc(doc(firestore, 'teacherDirectory', profile.id), directoryFrom(profile))
      return linked
    }
    if (requiresEmailVerification) await sendEmailVerification(credential.user)
    return profile
  },

  async signIn(email: string, password: string): Promise<Profile> {
    const { auth: firebaseAuth } = requireFirebase()
    const normalized = normalizeEmail(email)
    if (!normalized || !password) throw new Error('Enter both email and password.')
    const credential = await signInWithEmailAndPassword(firebaseAuth, normalized, password)
    await ensureTeacherAccount()
    const profile = await authenticatedProfile(credential.user.uid, credential.user.emailVerified)
    if (!profile) { await firebaseSignOut(firebaseAuth); throw new Error('Your account profile is not set up. Ask an administrator to create it.') }
    if (profile.role === 'student' && credential.user.emailVerified === false) return { ...profile, emailVerified: false, active: false }
    if (profile.role === 'teacher' && profile.active === false) {
      await firebaseSignOut(firebaseAuth)
      throw new Error('This teacher account is inactive. An administrator must activate it from Member management before you can sign in.')
    }
    if (profile.active === false) { await firebaseSignOut(firebaseAuth); throw new Error('This account has been suspended. Contact an administrator.') }
    return profile
  },

  async resendEmailVerification() {
    const { auth: firebaseAuth } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in again before requesting verification.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || !['student', 'teacher'].includes(profile.role)) throw new Error('This account does not require email verification.')
    await sendEmailVerification(firebaseAuth.currentUser)
  },

  async confirmEmailVerification(): Promise<Profile> {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in again before confirming verification.')
    await firebaseAuth.currentUser.reload()
    if (!firebaseAuth.currentUser.emailVerified) throw new Error('Your CUET email is not verified yet. Open the email link, then try again.')
    await firebaseAuth.currentUser.getIdToken(true)
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile) throw new Error('Your account profile is not set up.')
    if (profile.role === 'teacher') return linkTeacherAccount(profile)
    // This is deliberately two writes. The profile must become active before the
    // teacher-directory rule permits creation of a public teaching profile.
    await setDoc(doc(firestore, 'users', profile.id), { emailVerified: true, active: true, updatedAt: Date.now() }, { merge: true })
    return { ...profile, emailVerified: true, active: true }
  },

  async requestPasswordReset(email: string) {
    const { auth: firebaseAuth } = requireFirebase()
    const normalized = normalizeEmail(email)
    if (!normalized) throw new Error('Enter your email address first.')
    await sendPasswordResetEmail(firebaseAuth, normalized)
  },

  async changePassword(currentPassword: string, nextPassword: string) {
    const { auth: firebaseAuth } = requireFirebase()
    if (nextPassword.length < 8) throw new Error('Use a new password with at least 8 characters.')
    if (!firebaseAuth.currentUser?.email) throw new Error('Sign in again before changing your password.')
    const credential = EmailAuthProvider.credential(firebaseAuth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(firebaseAuth.currentUser, credential)
    await updatePassword(firebaseAuth.currentUser, nextPassword)
  },

  async uploadProfilePhoto(userId: string, uri: string) {
    const { auth: firebaseAuth } = requireFirebase()
    const url = backendUrl()
    if (!url) throw new Error('Profile photo uploads need EXPO_PUBLIC_BACKEND_URL. Configure the separate backend first.')
    if (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== userId) throw new Error('Sign in again before uploading a photo.')
    const token = await firebaseAuth.currentUser.getIdToken()
    const form = new FormData()
    form.append('photo', { uri, name: 'profile.jpg', type: 'image/jpeg' } as never)
    const response = await fetch(`${url}/v1/profile-photo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
    const result = await response.json().catch(() => ({})) as { photoUrl?: string; error?: string }
    if (!response.ok || !result.photoUrl) throw new Error(result.error ?? 'Profile photo upload failed.')
    return result.photoUrl
  },

  async signOut() {
    const { auth: firebaseAuth } = requireFirebase()
    await firebaseSignOut(firebaseAuth)
  },

  async updateProfile(profile: Profile) {
    const { db: firestore } = requireFirebase()
    const next: Profile = { ...profile, name: profile.name.trim(), department: profile.department.trim().toUpperCase(), designation: profile.role === 'teacher' ? profile.designation?.trim() : undefined, bio: profile.role === 'teacher' ? profile.bio?.trim() : undefined }
    const value: Record<string, unknown> = { name: next.name, email: next.email, role: next.role, department: next.department, darkMode: Boolean(next.darkMode), active: next.active !== false, updatedAt: Date.now() }
    if (next.designation) value.designation = next.designation
    if (next.role === 'teacher') value.bio = next.bio ?? ''
    if (next.photoUrl) value.photoUrl = next.photoUrl
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'users', next.id), value, { merge: true })
    if (next.role === 'teacher' && !next.teacherProfileId && !next.teacherLinkPending) batch.set(doc(firestore, 'teacherDirectory', next.id), directoryFrom(next), { merge: true })
    if (next.role === 'teacher' && next.teacherProfileId) batch.set(doc(firestore, 'teacherDirectory', next.teacherProfileId), { bio: next.bio ?? '', photoUrl: next.photoUrl ?? '', updatedAt: Date.now() }, { merge: true })
    await batch.commit()
    return next
  },

  async courses(): Promise<Course[]> {
    const { db: firestore } = requireFirebase()
    const profile = await this.session()
    const source = profile?.role === 'teacher'
      ? query(collection(firestore, 'courses'), where('teacherIds', 'array-contains-any', teacherIdentityIds(profile)), limit(QUERY_LIMITS.courses))
      : query(collection(firestore, 'courses'), limit(QUERY_LIMITS.courses))
    const [snapshot, teachers] = await Promise.all([getDocs(source), this.professors()])
    const names = new Map(teachers.map(teacher => [teacher.id, teacher.name]))
    return snapshot.docs.map(item => {
      const course = courseFrom(item.id, item.data())
      return { ...course, teacherNames: course.teacherIds.map((id, index) => names.get(id) ?? course.teacherNames[index] ?? 'Teacher') }
    }).sort((a, b) => a.code.localeCompare(b.code))
  },
  async course(id: string) { return (await this.courses()).find(course => course.id === id) ?? null },

  async professors(): Promise<Professor[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'teacherDirectory'), where('active', '==', true), limit(QUERY_LIMITS.courses)))
    return snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name ?? 'CUET Teacher'), department: String(item.data().department ?? ''), designation: item.data().designation ? String(item.data().designation) : undefined, email: item.data().email ? String(item.data().email) : undefined, bio: item.data().bio ? String(item.data().bio) : undefined, photoUrl: item.data().photoUrl ? String(item.data().photoUrl) : undefined }))
  },

  async reviews(courseId: string): Promise<Review[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseReviews'), where('courseId', '==', courseId), limit(QUERY_LIMITS.reviews)))
    const reviews = await Promise.all(snapshot.docs.map(async item => ({ ...reviewFrom(item.id, item.data()), responses: await firebaseTeacherResponses(item.id) })))
    return reviews.sort((left, right) => right.createdAt - left.createdAt)
  },
  async addReview(input: Omit<Review, 'id' | 'createdAt' | 'displayName' | 'updatedAt' | 'responses'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before submitting a review.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || profile.role !== 'student') throw new Error('Only verified student accounts can submit a course review.')
    const text = sanitizeCommunityText(input.text.trim())
    if (!text) throw new Error('Review text is required.')
    const reviewRef = doc(collection(firestore, 'courseReviews'))
    const createdAt = Date.now()
    const ratings = normalizeCourseRatings(input.ratings)
    const course = await this.course(input.courseId)
    const requestedInstance = input.courseInstanceId ? await getDoc(doc(firestore, 'courseInstances', input.courseInstanceId)) : null
    const instance = requestedInstance?.exists() ? {
      id: requestedInstance.id,
      courseId: String(requestedInstance.data().courseId ?? ''),
      batch: requestedInstance.data().batch ? String(requestedInstance.data().batch) : undefined,
      department: String(requestedInstance.data().department ?? ''),
      level: requestedInstance.data().level === '1' || requestedInstance.data().level === '2' || requestedInstance.data().level === '3' || requestedInstance.data().level === '4' ? requestedInstance.data().level : null,
      term: requestedInstance.data().term === '1' || requestedInstance.data().term === '2' ? requestedInstance.data().term : null,
      teacherIds: [], teacherNames: [],
    } : course ? await this.legacyCourseInstance(course) : null
    const instanceId = input.courseInstanceId ?? instance?.id
    const courseDepartment = (instance?.department ?? course?.department ?? '').trim().toUpperCase()
    const courseBatch = instance?.batch?.trim() || course?.batch?.trim()
    const coursePosition = academicPosition(instance?.level ?? course?.level, instance?.term ?? course?.term)
    const studentPosition = academicPosition(profile.currentLevel, profile.currentTerm)
    if (!course || !instanceId) throw new Error('This course is not available for review yet.')
    if (courseDepartment && courseDepartment !== profile.department.trim().toUpperCase()) throw new Error('You can review courses only from your department.')
    if (courseBatch && courseBatch !== profile.batch?.trim()) throw new Error('You can review courses only from your batch.')
    if (coursePosition !== null && studentPosition !== null && coursePosition > studentPosition) throw new Error('You can review courses only after reaching their academic level and term.')
    const existingReview = await getDoc(doc(firestore, 'users', profile.id, 'courseReviewIndex', input.courseId))
    if (existingReview.exists()) throw new Error('You have already reviewed this course.')
    const review = { courseId: input.courseId, ...(instanceId ? { courseInstanceId: instanceId } : {}), text, ratings, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt }
    const batch = writeBatch(firestore)
    batch.set(reviewRef, review)
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'courseReviews', reviewRef.id), { id: reviewRef.id, ...review })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'courseReviewIndex', input.courseId), { reviewId: reviewRef.id, courseId: input.courseId, createdAt })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'activity', `course-review-${reviewRef.id}`), { kind: 'courseReview', targetId: reviewRef.id, courseId: input.courseId, text, createdAt })
    await batch.commit()
  },
  async myReviews(userId: string) {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'users', userId, 'courseReviews'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => reviewFrom(item.id, item.data()))
  },
  async myCourseReview(userId: string, courseId: string): Promise<Review | null> {
    const { db: firestore } = requireFirebase()
    const index = await getDoc(doc(firestore, 'users', userId, 'courseReviewIndex', courseId))
    const reviewId = index.data()?.reviewId
    if (typeof reviewId !== 'string') return null
    const review = await getDoc(doc(firestore, 'users', userId, 'courseReviews', reviewId))
    return review.exists() ? reviewFrom(review.id, review.data()) : null
  },
  async updateReview(reviewId: string, input: Pick<Review, 'courseId' | 'text' | 'ratings' | 'anonymous'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before editing a review.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || profile.role !== 'student') throw new Error('Only verified student accounts can edit a course review.')
    const existing = await getDoc(doc(firestore, 'users', profile.id, 'courseReviews', reviewId))
    if (!existing.exists()) throw new Error('This review is no longer available to edit.')
    const createdAt = Number(existing.data().createdAt ?? 0)
    if (!createdAt || Date.now() - createdAt > 24 * 60 * 60 * 1000) throw new Error('The 24-hour review editing window has ended.')
    const text = sanitizeCommunityText(input.text.trim())
    if (!text) throw new Error('Review text is required.')
    const ratings = normalizeCourseRatings(input.ratings)
    const existingInstanceId = typeof existing.data().courseInstanceId === 'string' ? existing.data().courseInstanceId : undefined
    const review = { courseId: input.courseId, ...(existingInstanceId ? { courseInstanceId: existingInstanceId } : {}), text, ratings, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt, updatedAt: Date.now() }
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'courseReviews', reviewId), review)
    batch.set(doc(firestore, 'users', profile.id, 'courseReviews', reviewId), { id: reviewId, ...review })
    batch.set(doc(firestore, 'users', profile.id, 'activity', `course-review-${reviewId}`), { kind: 'courseReview', targetId: reviewId, courseId: input.courseId, text, createdAt: review.updatedAt }, { merge: true })
    await batch.commit()
  },
  async allReviews(): Promise<Review[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseReviews'), orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.reviews)))
    return snapshot.docs.map(item => reviewFrom(item.id, item.data()))
  },
  async deleteReview(reviewId: string) {
    const { db: firestore } = requireFirebase()
    const responses = await getDocs(collection(firestore, 'courseReviews', reviewId, 'teacherResponses'))
    if (responses.size > 480) throw new Error('This review has too many responses for a mobile moderation action.')
    const batch = writeBatch(firestore)
    responses.docs.forEach(response => batch.delete(response.ref))
    batch.delete(doc(firestore, 'courseReviews', reviewId))
    await batch.commit()
  },
  async addTeacherResponse(reviewId: string, text: string) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before responding.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || profile.role !== 'teacher') throw new Error('Only assigned teachers can respond to course feedback.')
    const responseText = sanitizeCommunityText(text.trim())
    if (!responseText) throw new Error('Write a response before posting.')
    const review = await getDoc(doc(firestore, 'courseReviews', reviewId))
    if (!review.exists()) throw new Error('This review no longer exists.')
    const responseRef = doc(collection(firestore, 'courseReviews', reviewId, 'teacherResponses'))
    await setDoc(responseRef, { teacherName: profile.name, text: responseText, createdAt: Date.now() })
  },

  async professorReviews(professorId: string): Promise<ProfessorReview[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'professorReviews'), where('professorId', '==', professorId), limit(QUERY_LIMITS.reviews)))
    const reviews = await Promise.all(snapshot.docs.map(async item => ({ ...professorReviewFrom(item.id, item.data()), responses: await firebaseProfessorResponses(item.id) })))
    return reviews.sort((left, right) => right.createdAt - left.createdAt)
  },
  async teachingProfileReviews(profile: Profile): Promise<ProfessorReview[]> {
    const linked = await linkTeacherAccount(profile)
    return (await Promise.all(teacherIdentityIds(linked).map(id => this.professorReviews(id)))).flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async addProfessorReview(input: Omit<ProfessorReview, 'id' | 'createdAt' | 'displayName'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before submitting a review.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || profile.role !== 'student') throw new Error('Only verified student accounts can submit a teacher review.')
    const text = sanitizeCommunityText(input.text.trim())
    if (!text) throw new Error('Review text is required.')
    const reviewRef = doc(collection(firestore, 'professorReviews'))
    const createdAt = Date.now()
    const rating = Math.max(1, Math.min(5, Math.round(input.rating)))
    const review = { professorId: input.professorId, text, rating, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt }
    const batch = writeBatch(firestore)
    batch.set(reviewRef, review)
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'professorReviews', reviewRef.id), { id: reviewRef.id, ...review })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'activity', `professor-review-${reviewRef.id}`), { kind: 'professorReview', targetId: reviewRef.id, professorId: input.professorId, text, createdAt })
    await batch.commit()
  },
  async myProfessorReviews(userId: string) {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'users', userId, 'professorReviews'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => professorReviewFrom(item.id, item.data()))
  },
  async allProfessorReviews(): Promise<ProfessorReview[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'professorReviews'), orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.reviews)))
    return snapshot.docs.map(item => professorReviewFrom(item.id, item.data()))
  },
  async deleteProfessorReview(reviewId: string) {
    const { db: firestore } = requireFirebase()
    const responses = await getDocs(collection(firestore, 'professorReviews', reviewId, 'teacherResponses'))
    if (responses.size > 480) throw new Error('This review has too many responses for a mobile moderation action.')
    const batch = writeBatch(firestore)
    responses.docs.forEach(response => batch.delete(response.ref))
    batch.delete(doc(firestore, 'professorReviews', reviewId))
    await batch.commit()
  },
  async addProfessorResponse(reviewId: string, text: string) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before responding.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (!profile || profile.role !== 'teacher') throw new Error('Only the reviewed teacher can respond.')
    const responseText = sanitizeCommunityText(text.trim())
    if (!responseText) throw new Error('Write a response before posting.')
    const review = await getDoc(doc(firestore, 'professorReviews', reviewId))
    if (!review.exists()) throw new Error('This review no longer exists.')
    const linked = await linkTeacherAccount(profile)
    if (!teacherIdentityIds(linked).includes(review.data().professorId)) throw new Error('You can respond only to feedback about your own teaching profile.')
    const responseRef = doc(collection(firestore, 'professorReviews', reviewId, 'teacherResponses'))
    await setDoc(responseRef, { teacherName: profile.name, text: responseText, createdAt: Date.now() })
  },

  async courseQuestions(courseId: string): Promise<CourseQuestion[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseQuestions'), where('courseId', '==', courseId), limit(QUERY_LIMITS.questions)))
    return (await firebaseQuestions(snapshot)).sort((left, right) => right.createdAt - left.createdAt)
  },
  async addCourseQuestion(input: Omit<CourseQuestion, 'id' | 'createdAt' | 'answers'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before posting a question.')
    const text = sanitizeCommunityText(input.text.trim())
    if (!text) throw new Error('Question text is required.')
    const questionRef = doc(collection(firestore, 'courseQuestions'))
    // An opaque recipient key links a future answer notice to this student's
    // private mirror. It is not a UID and cannot identify the question author.
    const notificationKey = doc(collection(firestore, 'courseQuestionNotifications')).id
    const createdAt = Date.now()
    const course = await this.course(input.courseId)
    const instance = course ? await this.legacyCourseInstance(course) : null
    const instanceId = input.courseInstanceId ?? instance?.id
    const question = { courseId: input.courseId, ...(instanceId ? { courseInstanceId: instanceId } : {}), category: input.category, text, anonymous: true, notificationKey, createdAt }
    const courseSnapshot = await getDoc(doc(firestore, 'courses', input.courseId))
    if (!courseSnapshot.exists()) throw new Error('This course no longer exists.')
    const teacherIds: string[] = Array.isArray(courseSnapshot.data().teacherIds) ? courseSnapshot.data().teacherIds.map(String) : []
    const batch = writeBatch(firestore)
    batch.set(questionRef, question)
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'questions', questionRef.id), { id: questionRef.id, ...question })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'activity', `question-${questionRef.id}`), { kind: 'question', targetId: questionRef.id, courseId: input.courseId, text: `[${input.category}] ${text}`, createdAt })
    teacherIds.forEach(teacherId => batch.set(doc(firestore, 'notifications', `${teacherId}-${questionRef.id}`), { recipientId: teacherId, questionId: questionRef.id, courseId: input.courseId, title: 'New question in your course', body: text.slice(0, 180), read: false, createdAt }))
    await batch.commit()
  },
  async teacherQuestions(teacherId: string): Promise<CourseQuestion[]> {
    const profile = await this.session()
    if (!profile || profile.role !== 'teacher' || profile.id !== teacherId) throw new Error('Sign in as the assigned teacher.')
    const assignedCourses = (await this.courses()).filter(course => teachesCourse(course, profile))
    const all = await Promise.all(assignedCourses.map(course => this.courseQuestions(course.id)))
    return all.flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async allCourseQuestions(): Promise<CourseQuestion[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseQuestions'), orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.questions)))
    return firebaseQuestions(snapshot)
  },
  async deleteCourseQuestion(questionId: string) {
    const { db: firestore } = requireFirebase()
    const answers = await getDocs(collection(firestore, 'courseQuestions', questionId, 'answers'))
    if (answers.size > 380) throw new Error('This question has too many answers for a mobile moderation action.')
    const batch = writeBatch(firestore)
    answers.docs.forEach(answer => batch.delete(answer.ref))
    batch.delete(doc(firestore, 'courseQuestions', questionId))
    await batch.commit()
  },
  async deleteQuestionAnswer(questionId: string, answerId: string) {
    const { db: firestore } = requireFirebase()
    await deleteDoc(doc(firestore, 'courseQuestions', questionId, 'answers', answerId))
  },
  async reportContent(contentType: ContentType, contentId: string, reason: ReportReason, questionId?: string, description = '', courseInstanceId?: string) {
    const { auth: firebaseAuth } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before reporting content.')
    const url = backendUrl()
    if (!url) throw new Error('Reporting requires the configured moderation backend.')
    const token = await firebaseAuth.currentUser.getIdToken()
    const response = await fetch(`${url}/v1/reports`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ contentType, contentId, reason, description, questionId, ...(courseInstanceId ? { courseInstanceId } : {}) }) })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Could not submit the report.')
  },
  async migrateCourseInstances() {
    const { auth: firebaseAuth } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in as an administrator before migrating course instances.')
    const url = backendUrl()
    if (!url) throw new Error('Course-instance migration requires the configured backend.')
    const token = await firebaseAuth.currentUser.getIdToken()
    const response = await fetch(`${url}/v1/admin/migrations/course-instances`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const result = await response.json().catch(() => ({})) as { error?: string; courses?: number; batches?: number }
    if (!response.ok) throw new Error(result.error ?? 'Could not migrate course instances.')
    return { courses: result.courses ?? 0, batches: result.batches ?? 0 }
  },
  async reports(): Promise<Report[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.moderation)))
    return snapshot.docs.map(item => reportFrom(item.id, item.data()))
  },
  async allReports(): Promise<Report[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'reports'), orderBy('createdAt', 'desc'), limit(QUERY_LIMITS.moderation)))
    return snapshot.docs.map(item => reportFrom(item.id, item.data()))
  },
  subscribeAllReports(onChange: (reports: Report[]) => void, onError: (reason: Error) => void): Unsubscribe {
    const { db: firestore } = requireFirebase()
    return onSnapshot(query(collection(firestore, 'reports'), orderBy('createdAt', 'desc')), snapshot => {
      onChange(snapshot.docs.map(item => reportFrom(item.id, item.data())))
    }, reason => onError(reason instanceof Error ? reason : new Error('Unable to watch reports.')))
  },
  async adminNotifications(): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'adminNotifications'), orderBy('createdAt', 'desc')))
    return snapshot.docs
      .filter(item => {
        const data = item.data()
        const title = String(data.title ?? '').toLowerCase()
        const body = String(data.body ?? '').toLowerCase()
        return data.category !== 'questions' && typeof data.questionId !== 'string' && !title.includes('unanswered question') && !body.includes('unanswered question')
      })
      .map(item => {
        const data = item.data()
        return { id: item.id, reportId: typeof data.reportId === 'string' ? data.reportId : undefined, title: String(data.title ?? 'Admin notification'), body: String(data.body ?? ''), read: data.read === true, createdAt: Number(data.createdAt ?? 0), category: adminNotificationCategory(data) }
      })
  },
  subscribeAdminNotifications(onChange: (notifications: AppNotification[]) => void, onError: (reason: Error) => void): Unsubscribe {
    const { db: firestore } = requireFirebase()
    return onSnapshot(query(collection(firestore, 'adminNotifications'), orderBy('createdAt', 'desc')), snapshot => {
      const notifications = snapshot.docs.filter(item => {
        const data = item.data()
        const title = String(data.title ?? '').toLowerCase()
        const body = String(data.body ?? '').toLowerCase()
        return data.category !== 'questions' && typeof data.questionId !== 'string' && !title.includes('unanswered question') && !body.includes('unanswered question')
      }).map(item => {
        const data = item.data()
        return { id: item.id, reportId: typeof data.reportId === 'string' ? data.reportId : undefined, title: String(data.title ?? 'Admin notification'), body: String(data.body ?? ''), read: data.read === true, createdAt: Number(data.createdAt ?? 0), category: adminNotificationCategory(data) }
      })
      onChange(notifications)
    }, reason => onError(reason instanceof Error ? reason : new Error('Unable to watch admin notifications.')))
  },
  async markAdminNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'adminNotifications', notificationId), { read: true }, { merge: true })
  },
  async teacherNotifications(userId: string): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const profile = await this.session()
    if (!profile || profile.id !== userId) throw new Error('Sign in to read your notifications.')
    const snapshot = await getDocs(query(collection(firestore, 'notifications'), where('recipientId', 'in', teacherIdentityIds(profile)), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, questionId: String(item.data().questionId ?? ''), courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? 'Course notification'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) }))
  },
  subscribeTeacherNotifications(userId: string, onChange: (notifications: AppNotification[]) => void, onError: (reason: Error) => void): Unsubscribe {
    const { db: firestore } = requireFirebase()
    let disposed = false
    let unsubscribe: Unsubscribe | undefined
    void this.session().then(profile => {
      if (disposed) return
      if (!profile || profile.id !== userId) throw new Error('Sign in to read your notifications.')
      unsubscribe = onSnapshot(query(collection(firestore, 'notifications'), where('recipientId', 'in', teacherIdentityIds(profile)), orderBy('createdAt', 'desc')), snapshot => {
      onChange(snapshot.docs.map(item => ({ id: item.id, questionId: String(item.data().questionId ?? ''), courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? 'Course notification'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) })))
      }, reason => onError(reason instanceof Error ? reason : new Error('Unable to watch notifications.')))
    }).catch(reason => { if (!disposed) onError(reason instanceof Error ? reason : new Error('Unable to watch notifications.')) })
    return () => { disposed = true; unsubscribe?.() }
  },
  async markTeacherNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'notifications', notificationId), { read: true }, { merge: true })
  },
  async updateReportStatus(reportId: string, status: Report['status'], action: ReportAction = status === 'resolved' ? 'other' : 'kept') {
    const { db: firestore } = requireFirebase()
    const createdAt = Date.now()
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'reports', reportId), { status, action, resolvedAt: createdAt }, { merge: true })
    batch.set(doc(collection(firestore, 'moderationHistory')), { action, targetType: 'report', targetId: reportId, reportId, summary: `Report ${action}.`, createdAt })
    await batch.commit()
  },
  async warnReportedUser(reportId: string) {
    const { auth: firebaseAuth } = requireFirebase()
    const url = backendUrl()
    if (!url) throw new Error('Identity-safe account warnings require EXPO_PUBLIC_BACKEND_URL and the separate backend.')
    if (!firebaseAuth.currentUser) throw new Error('Sign in again before moderating content.')
    const token = await firebaseAuth.currentUser.getIdToken()
    const response = await fetch(`${url}/v1/reports/${encodeURIComponent(reportId)}/warn`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Could not issue the account warning.')
  },
  async suspendReportedUser(reportId: string) {
    const { auth: firebaseAuth } = requireFirebase()
    const url = backendUrl()
    if (!url || !firebaseAuth.currentUser) throw new Error('Account suspension requires the configured moderation backend.')
    const token = await firebaseAuth.currentUser.getIdToken()
    const response = await fetch(`${url}/v1/reports/${encodeURIComponent(reportId)}/action`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suspended' }) })
    const result = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Could not suspend the reported user.')
  },
  async courseGuides(courseId: string): Promise<CourseGuide[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseGuides'), where('courseId', '==', courseId), limit(QUERY_LIMITS.guides)))
    return snapshot.docs.map(item => ({ id: item.id, courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? ''), text: String(item.data().text ?? ''), resources: item.data().resources ? String(item.data().resources) : undefined, createdAt: Number(item.data().createdAt ?? 0) })).sort((left, right) => right.createdAt - left.createdAt)
  },
  async addCourseGuide(input: Omit<CourseGuide, 'id' | 'createdAt'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before sharing guidance.')
    const title = sanitizeCommunityText(input.title.trim())
    const text = sanitizeCommunityText(input.text.trim())
    if (!title || !text) throw new Error('Add a guide title and useful advice.')
    const course = await this.course(input.courseId)
    const instance = course ? await this.legacyCourseInstance(course) : null
    const instanceId = input.courseInstanceId ?? instance?.id
    const completionIds = input.courseInstanceId
      ? [input.courseInstanceId]
      : [input.courseId, ...(instanceId && instanceId !== input.courseId ? [instanceId] : [])]
    const completed = await Promise.all(completionIds.map(id => getDoc(doc(firestore, 'users', firebaseAuth.currentUser!.uid, 'completedCourses', id))))
    if (!completed.some(snapshot => snapshot.exists() && snapshot.data().completed === true)) throw new Error('You can share advice only for a course you have completed.')
    const guideRef = doc(collection(firestore, 'courseGuides'))
    const createdAt = Date.now()
    const batch = writeBatch(firestore)
    batch.set(guideRef, { courseId: input.courseId, ...(instanceId ? { courseInstanceId: instanceId } : {}), title, text, resources: input.resources?.trim() || '', createdAt })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'guides', guideRef.id), {
      id: guideRef.id,
      courseId: input.courseId,
      ...(instanceId ? { courseInstanceId: instanceId } : {}),
      createdAt,
    })
    await batch.commit()
  },
  async deleteCourseGuide(guideId: string) {
    const { db: firestore } = requireFirebase()
    await deleteDoc(doc(firestore, 'courseGuides', guideId))
  },
  async addQuestionAnswer(questionId: string, author: Profile, text: string) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before answering a question.')
    const answerText = sanitizeCommunityText(text.trim())
    if (!answerText) throw new Error('Answer text is required.')
    const question = await getDoc(doc(firestore, 'courseQuestions', questionId))
    if (!question.exists()) throw new Error('Question no longer exists.')
    const answerRef = doc(collection(firestore, 'courseQuestions', questionId, 'answers'))
    const createdAt = Date.now()
    const answer = { authorRole: author.role === 'teacher' ? 'teacher' : 'student', authorName: author.role === 'teacher' ? author.name : 'A student', text: answerText, createdAt }
    const batch = writeBatch(firestore)
    batch.set(answerRef, answer)
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'answers', answerRef.id), { id: answerRef.id, questionId, courseId: String(question.data().courseId ?? ''), authorRole: answer.authorRole, createdAt })
    if (author.role === 'teacher') {
      const notificationKey = question.data().notificationKey
      if (typeof notificationKey === 'string') batch.set(doc(firestore, 'courseQuestionNotifications', answerRef.id), {
        questionId, courseId: String(question.data().courseId ?? ''), notificationKey,
        title: 'Your course question has a teacher response', body: answerText.slice(0, 180), read: false, createdAt,
      })
    }
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'activity', `answer-${answerRef.id}`), { kind: 'answer', targetId: answerRef.id, questionId, courseId: question.data().courseId, text: answerText, createdAt })
    await batch.commit()
  },

  async questionNotifications(userId: string): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const questions = await getDocs(collection(firestore, 'users', userId, 'questions'))
    const groups = await Promise.all(questions.docs.map(async question => {
      const notificationKey = question.data().notificationKey
      if (typeof notificationKey !== 'string') return []
      const snapshot = await getDocs(query(collection(firestore, 'courseQuestionNotifications'), where('questionId', '==', question.id), where('notificationKey', '==', notificationKey)))
      return snapshot.docs.map(item => ({ id: item.id, questionId: String(item.data().questionId ?? ''), courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? 'Course update'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) })).sort((left, right) => right.createdAt - left.createdAt)
    }))
    return groups.flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async markQuestionNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'courseQuestionNotifications', notificationId), { read: true }, { merge: true })
  },
  async userNotifications(userId: string): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const profile = await this.session()
    if (!profile || profile.id !== userId) throw new Error('Sign in to read your notifications.')
    const snapshot = await getDocs(query(collection(firestore, 'userNotifications'), where('recipientId', '==', userId), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, reportId: typeof item.data().reportId === 'string' ? item.data().reportId : undefined, title: String(item.data().title ?? 'Notification'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0), category: 'reports' }))
  },
  async markUserNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'userNotifications', notificationId), { read: true }, { merge: true })
  },

  async myActivity(userId: string): Promise<ActivityItem[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'users', userId, 'activity'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => activityFrom(item.id, item.data()))
  },

  async adminUsers(): Promise<Profile[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(collection(firestore, 'users'))
    return snapshot.docs.map(item => profileFrom(item.id, item.data()))
  },
  async departments(): Promise<string[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(collection(firestore, 'departments'))
    return snapshot.docs.map(item => String(item.data().name ?? item.id)).sort()
  },
  async addDepartment(name: string) {
    const { db: firestore } = requireFirebase()
    const normalized = name.trim().toUpperCase()
    if (!normalized || !/^[A-Z0-9-]{2,24}$/.test(normalized)) throw new Error('Use a valid department code.')
    await setDoc(doc(firestore, 'departments', normalized), { name: normalized, updatedAt: Date.now() })
  },
  async deleteDepartment(name: string) {
    const { db: firestore } = requireFirebase()
    await deleteDoc(doc(firestore, 'departments', name))
  },
  async updateUserStatus(user: Profile, active: boolean) {
    const { db: firestore } = requireFirebase()
    if (user.role !== 'student') throw new Error('Only student accounts can be suspended by an administrator.')
    if (active) throw new Error('Student accounts can only be suspended from the admin workspace.')
    const batch = writeBatch(firestore)
    const createdAt = Date.now()
    batch.set(doc(firestore, 'users', user.id), { active, updatedAt: Date.now() }, { merge: true })
    batch.set(doc(collection(firestore, 'moderationHistory')), { action: active ? 'activated' : 'suspended', targetType: 'user', targetId: user.id, summary: `${user.name} account ${active ? 'activated' : 'suspended'}.`, createdAt })
    await batch.commit()
    return { ...user, active }
  },
  async createCourse(input: Omit<Course, 'id'>) {
    const { db: firestore } = requireFirebase()
    const assignments = await courseTeacherAssignments(input.teacherIds)
    const value = { ...input, ...assignments, status: input.status ?? 'active', code: input.code.trim().toUpperCase(), title: input.title.trim(), department: input.department.trim().toUpperCase(), tags: input.tags.map(tag => tag.trim()).filter(Boolean), createdAt: Date.now(), updatedAt: Date.now() }
    if (!value.code || !value.title || !Number.isFinite(value.credits) || value.credits <= 0 || !value.level || !value.term || !value.courseType) throw new Error('Course code, title, valid credits, CUET level, term, and type are required.')
    const ref = doc(collection(firestore, 'courses'))
    const instanceRef = doc(firestore, 'courseInstances', legacyInstanceId(ref.id))
    const now = Date.now()
    const batch = writeBatch(firestore)
    batch.set(ref, value)
    batch.set(instanceRef, { courseId: ref.id, batch: value.batch ?? '', department: value.department, level: value.level, term: value.term, teacherIds: value.teacherIds, teacherNames: value.teacherNames, legacy: true, createdAt: now, updatedAt: now })
    await batch.commit()
    return { id: ref.id, ...value }
  },
  async updateCourse(courseId: string, input: Omit<Course, 'id'>) {
    const { db: firestore } = requireFirebase()
    const assignments = await courseTeacherAssignments(input.teacherIds)
    const value = { ...input, ...assignments, status: input.status ?? 'active', code: input.code.trim().toUpperCase(), title: input.title.trim(), department: input.department.trim().toUpperCase(), tags: input.tags.map(tag => tag.trim()).filter(Boolean), updatedAt: Date.now() }
    if (!value.code || !value.title || !Number.isFinite(value.credits) || value.credits <= 0 || !value.level || !value.term || !value.courseType) throw new Error('Course code, title, valid credits, CUET level, term, and type are required.')
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'courses', courseId), value, { merge: true })
    batch.set(doc(firestore, 'courseInstances', legacyInstanceId(courseId)), { courseId, batch: value.batch ?? '', department: value.department, level: value.level, term: value.term, teacherIds: value.teacherIds, teacherNames: value.teacherNames, legacy: true, updatedAt: Date.now() }, { merge: true })
    await batch.commit()
    return { id: courseId, ...value }
  },
  async deleteCourse(courseId: string) {
    const { db: firestore } = requireFirebase()
    await deleteDoc(doc(firestore, 'courses', courseId))
    const [reviews, questions, guides] = await Promise.all([
      getDocs(query(collection(firestore, 'courseReviews'), where('courseId', '==', courseId), limit(QUERY_LIMITS.reviews))),
      getDocs(query(collection(firestore, 'courseQuestions'), where('courseId', '==', courseId), limit(QUERY_LIMITS.questions))),
      getDocs(query(collection(firestore, 'courseGuides'), where('courseId', '==', courseId), limit(QUERY_LIMITS.guides))),
    ])
    const [answerLists, responseLists] = await Promise.all([
      Promise.all(questions.docs.map(question => getDocs(collection(firestore, 'courseQuestions', question.id, 'answers')))),
      Promise.all(reviews.docs.map(review => getDocs(collection(firestore, 'courseReviews', review.id, 'teacherResponses')))),
    ])
    const refs = [
      ...reviews.docs.map(review => review.ref),
      ...questions.docs.map(question => question.ref),
      ...guides.docs.map(guide => guide.ref),
      ...answerLists.flatMap(answers => answers.docs.map(answer => answer.ref)),
      ...responseLists.flatMap(responses => responses.docs.map(response => response.ref)),
    ]
    for (let start = 0; start < refs.length; start += 450) {
      const batch = writeBatch(firestore)
      refs.slice(start, start + 450).forEach(reference => batch.delete(reference))
      await batch.commit()
    }
  },
  async archiveCourse(course: Course, status: CourseStatus = 'archived') {
    const { db: firestore } = requireFirebase()
    const createdAt = Date.now()
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'courses', course.id), { status, updatedAt: createdAt }, { merge: true })
    batch.set(doc(collection(firestore, 'moderationHistory')), { action: 'archived', targetType: 'course', targetId: course.id, summary: `${course.code} marked ${status}.`, createdAt })
    await batch.commit()
  },
  async moderationHistory(): Promise<ModerationHistoryItem[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'moderationHistory'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, action: item.data().action as ModerationHistoryItem['action'], targetType: String(item.data().targetType ?? ''), targetId: String(item.data().targetId ?? ''), summary: String(item.data().summary ?? ''), createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async appeals(): Promise<ModerationAppeal[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'appeals'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, reportId: String(item.data().reportId ?? ''), submittedBy: String(item.data().submittedBy ?? ''), reason: String(item.data().reason ?? ''), status: item.data().status as ModerationAppeal['status'], createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async updateAppealStatus(appealId: string, status: ModerationAppeal['status']) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'appeals', appealId), { status, resolvedAt: Date.now() }, { merge: true })
  },
}

export const defaultRatings: RatingMap = { teachingQuality: 5, workload: 3, gradingFairness: 5, courseStructure: 5, availability: 5, difficulty: 3, learningValue: 5 }
