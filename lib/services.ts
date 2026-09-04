import { EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { auth, db, firebaseEnabled } from './firebase'
import { sanitizeCommunityText } from './content-filter'
import type { AcademicLevel, AcademicTerm, ActivityItem, AppNotification, ContentType, Course, CourseGuide, CourseQuestion, CourseType, Professor, ProfessorReview, Profile, QuestionAnswer, QuestionCategory, RatingMap, Report, ReportReason, Review, Role, TeacherResponse } from './types'

const normalizeEmail = (email: string) => email.trim().toLowerCase()
const isStudentEmail = (email: string) => /^u\d+@student\.cuet\.ac\.bd$/.test(email)
const isTeacherEmail = (email: string) => /^u\d+@teacher\.cuet\.ac\.bd$/.test(email)
const backendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''

function requireFirebase() {
  if (!firebaseEnabled || !auth || !db) throw new Error('Firebase is not configured. Copy .env.example to .env and add your Firebase web app values.')
  return { auth, db }
}

const profileFrom = (id: string, data: Record<string, unknown>): Profile => ({
  id,
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
  teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds.map(String) : [],
  teacherNames: Array.isArray(data.teacherNames) ? data.teacherNames.map(String) : [],
  tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
})

const reviewFrom = (id: string, data: Record<string, unknown>): Review => {
  const storedRatings = (data.ratings ?? {}) as Record<string, unknown>
  const rating = (key: keyof RatingMap, fallback: number) => Number(storedRatings[key] ?? fallback)
  return {
  id, courseId: String(data.courseId ?? ''), text: String(data.text ?? ''), ratings: {
    teachingQuality: rating('teachingQuality', 0), workload: rating('workload', 0), gradingFairness: rating('gradingFairness', 0), courseStructure: rating('courseStructure', 0), availability: rating('availability', 0), difficulty: rating('difficulty', 0), learningValue: rating('learningValue', 0),
  },
  anonymous: data.anonymous !== false, displayName: typeof data.displayName === 'string' ? data.displayName : null, createdAt: Number(data.createdAt ?? 0), updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
}}

const professorReviewFrom = (id: string, data: Record<string, unknown>): ProfessorReview => ({
  id, professorId: String(data.professorId ?? ''), text: String(data.text ?? ''), rating: Number(data.rating ?? 0),
  anonymous: data.anonymous !== false, displayName: typeof data.displayName === 'string' ? data.displayName : null, createdAt: Number(data.createdAt ?? 0),
})

const answerFrom = (id: string, data: Record<string, unknown>): QuestionAnswer => ({
  id, authorName: String(data.authorName ?? 'A student'), authorRole: data.authorRole === 'teacher' ? 'teacher' : 'student', text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0),
})

const questionFrom = (id: string, data: Record<string, unknown>): CourseQuestion => ({
  id, courseId: String(data.courseId ?? ''), category: ['Course Content', 'Exam', 'Assignment', 'Project', 'Registration', 'Other'].includes(String(data.category)) ? String(data.category) as QuestionCategory : 'Other', text: String(data.text ?? ''), anonymous: data.anonymous !== false, createdAt: Number(data.createdAt ?? 0), answers: [],
})

const activityFrom = (id: string, data: Record<string, unknown>): ActivityItem => ({
  id, kind: data.kind as ActivityItem['kind'], targetId: String(data.targetId ?? ''), text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0),
  ...(typeof data.courseId === 'string' ? { courseId: data.courseId } : {}),
  ...(typeof data.professorId === 'string' ? { professorId: data.professorId } : {}),
  ...(typeof data.questionId === 'string' ? { questionId: data.questionId } : {}),
})

async function firebaseProfile(userId: string): Promise<Profile | null> {
  const { db: firestore } = requireFirebase()
  const snapshot = await getDoc(doc(firestore, 'users', userId))
  return snapshot.exists() ? profileFrom(snapshot.id, snapshot.data()) : null
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

  subscribeToSession(callback: (profile: Profile | null) => void) {
    if (!firebaseEnabled || !auth) { callback(null); return () => undefined }
    return onAuthStateChanged(auth, user => { void (user ? firebaseProfile(user.uid) : Promise.resolve(null)).then(callback).catch(() => callback(null)) })
  },

  async session(): Promise<Profile | null> {
    if (!firebaseEnabled || !auth?.currentUser) return null
    return firebaseProfile(auth.currentUser.uid)
  },

  async signUp(name: string, email: string, password: string, role: Role, department: string, designation?: string, studentDetails?: { batch: string; studentId: string; currentLevel: AcademicLevel; currentTerm: AcademicTerm }): Promise<Profile> {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    const normalized = normalizeEmail(email)
    const normalizedDepartment = department.trim().toUpperCase()
    if (role === 'admin') throw new Error('Administrator accounts are provisioned separately.')
    if (!name.trim() || !normalizedDepartment) throw new Error('Enter your full name and department.')
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
    if (role === 'student' && !isStudentEmail(normalized)) throw new Error('Use u{ID}@student.cuet.ac.bd for a student account.')
    if (role === 'teacher' && !isTeacherEmail(normalized)) throw new Error('Use u{ID}@teacher.cuet.ac.bd for a teacher account.')
    if (role === 'teacher' && !designation?.trim()) throw new Error('Choose your teaching position.')
    if (role === 'student' && (!studentDetails?.batch.trim() || !studentDetails.studentId.trim() || !studentDetails.currentLevel || !studentDetails.currentTerm)) throw new Error('Add your batch, student ID, current level, and current term.')

    const credential = await createUserWithEmailAndPassword(firebaseAuth, normalized, password)
    const requiresEmailVerification = role === 'student'
    const profile: Profile = { id: credential.user.uid, name: name.trim(), email: normalized, role, department: normalizedDepartment, designation: role === 'teacher' ? designation?.trim() : undefined, darkMode: false, active: !requiresEmailVerification, emailVerified: !requiresEmailVerification, ...(role === 'student' && studentDetails ? { batch: studentDetails.batch.trim(), studentId: studentDetails.studentId.trim(), currentLevel: studentDetails.currentLevel, currentTerm: studentDetails.currentTerm } : {}) }
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
      throw reason
    }
    if (requiresEmailVerification) await sendEmailVerification(credential.user)
    return profile
  },

  async signIn(email: string, password: string): Promise<Profile> {
    const { auth: firebaseAuth } = requireFirebase()
    const normalized = normalizeEmail(email)
    if (!normalized || !password) throw new Error('Enter both email and password.')
    const credential = await signInWithEmailAndPassword(firebaseAuth, normalized, password)
    const profile = await firebaseProfile(credential.user.uid)
    if (!profile) { await firebaseSignOut(firebaseAuth); throw new Error('Your account profile is not set up. Ask an administrator to create it.') }
    if (profile.emailVerified === false) return profile
    if (profile.active === false) { await firebaseSignOut(firebaseAuth); throw new Error('This account has been suspended. Contact an administrator.') }
    return profile
  },

  async resendEmailVerification() {
    const { auth: firebaseAuth } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in again before requesting verification.')
    const profile = await firebaseProfile(firebaseAuth.currentUser.uid)
    if (profile?.role !== 'student') throw new Error('Teacher accounts do not require email verification.')
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
    // This is deliberately two writes. The profile must become active before the
    // teacher-directory rule permits creation of a public teaching profile.
    await setDoc(doc(firestore, 'users', profile.id), { emailVerified: true, active: true, updatedAt: Date.now() }, { merge: true })
    if (profile.role === 'teacher') await setDoc(doc(firestore, 'teacherDirectory', profile.id), directoryFrom({ ...profile, emailVerified: true, active: true }))
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
    if (next.role === 'teacher') batch.set(doc(firestore, 'teacherDirectory', next.id), directoryFrom(next), { merge: true })
    await batch.commit()
    return next
  },

  async courses(): Promise<Course[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(collection(firestore, 'courses'))
    return snapshot.docs.map(item => courseFrom(item.id, item.data())).sort((a, b) => a.code.localeCompare(b.code))
  },
  async course(id: string) { return (await this.courses()).find(course => course.id === id) ?? null },

  async professors(): Promise<Professor[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'teacherDirectory'), where('active', '==', true)))
    return snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name ?? 'CUET Teacher'), department: String(item.data().department ?? ''), designation: item.data().designation ? String(item.data().designation) : undefined, bio: item.data().bio ? String(item.data().bio) : undefined, photoUrl: item.data().photoUrl ? String(item.data().photoUrl) : undefined }))
  },

  async reviews(courseId: string): Promise<Review[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseReviews'), where('courseId', '==', courseId), orderBy('createdAt', 'desc')))
    return Promise.all(snapshot.docs.map(async item => ({ ...reviewFrom(item.id, item.data()), responses: await firebaseTeacherResponses(item.id) })))
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
    const review = { courseId: input.courseId, text, ratings: input.ratings, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt }
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
    const review = { courseId: input.courseId, text, ratings: input.ratings, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt, updatedAt: Date.now() }
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'courseReviews', reviewId), review)
    batch.set(doc(firestore, 'users', profile.id, 'courseReviews', reviewId), { id: reviewId, ...review })
    batch.set(doc(firestore, 'users', profile.id, 'activity', `course-review-${reviewId}`), { kind: 'courseReview', targetId: reviewId, courseId: input.courseId, text, createdAt: review.updatedAt }, { merge: true })
    await batch.commit()
  },
  async allReviews(): Promise<Review[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseReviews'), orderBy('createdAt', 'desc')))
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
    const snapshot = await getDocs(query(collection(firestore, 'professorReviews'), where('professorId', '==', professorId), orderBy('createdAt', 'desc')))
    return Promise.all(snapshot.docs.map(async item => ({ ...professorReviewFrom(item.id, item.data()), responses: await firebaseProfessorResponses(item.id) })))
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
    const review = { professorId: input.professorId, text, rating: input.rating, anonymous: input.anonymous, displayName: input.anonymous ? null : profile.name, createdAt }
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
    const snapshot = await getDocs(query(collection(firestore, 'professorReviews'), orderBy('createdAt', 'desc')))
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
    if (review.data().professorId !== profile.id) throw new Error('You can respond only to feedback about your own teaching profile.')
    const responseRef = doc(collection(firestore, 'professorReviews', reviewId, 'teacherResponses'))
    await setDoc(responseRef, { teacherName: profile.name, text: responseText, createdAt: Date.now() })
  },

  async courseQuestions(courseId: string): Promise<CourseQuestion[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseQuestions'), where('courseId', '==', courseId), orderBy('createdAt', 'desc')))
    return firebaseQuestions(snapshot)
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
    const question = { courseId: input.courseId, category: input.category, text, anonymous: true, notificationKey, createdAt }
    const course = await getDoc(doc(firestore, 'courses', input.courseId))
    if (!course.exists()) throw new Error('This course no longer exists.')
    const teacherIds: string[] = Array.isArray(course.data().teacherIds) ? course.data().teacherIds.map(String) : []
    const batch = writeBatch(firestore)
    batch.set(questionRef, question)
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'questions', questionRef.id), { id: questionRef.id, ...question })
    batch.set(doc(firestore, 'users', firebaseAuth.currentUser.uid, 'activity', `question-${questionRef.id}`), { kind: 'question', targetId: questionRef.id, courseId: input.courseId, text: `[${input.category}] ${text}`, createdAt })
    teacherIds.forEach(teacherId => batch.set(doc(firestore, 'notifications', `${teacherId}-${questionRef.id}`), { recipientId: teacherId, questionId: questionRef.id, courseId: input.courseId, title: 'New question in your course', body: text.slice(0, 180), read: false, createdAt }))
    await batch.commit()
  },
  async teacherQuestions(teacherId: string): Promise<CourseQuestion[]> {
    const assignedCourses = (await this.courses()).filter(course => course.teacherIds.includes(teacherId))
    const all = await Promise.all(assignedCourses.map(course => this.courseQuestions(course.id)))
    return all.flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async allCourseQuestions(): Promise<CourseQuestion[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseQuestions'), orderBy('createdAt', 'desc')))
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
  async reportContent(contentType: ContentType, contentId: string, reason: ReportReason, questionId?: string) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before reporting content.')
    const reportRef = doc(collection(firestore, 'reports'))
    if (contentType === 'answer' && !questionId) throw new Error('The question context is required to report an answer.')
    const createdAt = Date.now()
    await setDoc(reportRef, { contentType, contentId, reportedBy: firebaseAuth.currentUser.uid, reason, status: 'pending', createdAt, ...(questionId ? { questionId } : {}) })
    await setDoc(doc(firestore, 'adminNotifications', reportRef.id), { reportId: reportRef.id, title: 'New reported content', body: `${reason} report requires review.`, read: false, createdAt })
  },
  async reports(): Promise<Report[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, contentType: item.data().contentType as ContentType, contentId: String(item.data().contentId ?? ''), ...(typeof item.data().questionId === 'string' ? { questionId: item.data().questionId } : {}), reason: item.data().reason as ReportReason, status: item.data().status as Report['status'], createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async adminNotifications(): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'adminNotifications'), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, title: String(item.data().title ?? 'Admin notification'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async teacherNotifications(userId: string): Promise<AppNotification[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'notifications'), where('recipientId', '==', userId), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, questionId: String(item.data().questionId ?? ''), courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? 'Course notification'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async markTeacherNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'notifications', notificationId), { read: true }, { merge: true })
  },
  async updateReportStatus(reportId: string, status: Report['status']) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'reports', reportId), { status, resolvedAt: Date.now() }, { merge: true })
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
  async courseGuides(courseId: string): Promise<CourseGuide[]> {
    const { db: firestore } = requireFirebase()
    const snapshot = await getDocs(query(collection(firestore, 'courseGuides'), where('courseId', '==', courseId), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(item => ({ id: item.id, courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? ''), text: String(item.data().text ?? ''), resources: item.data().resources ? String(item.data().resources) : undefined, createdAt: Number(item.data().createdAt ?? 0) }))
  },
  async addCourseGuide(input: Omit<CourseGuide, 'id' | 'createdAt'>) {
    const { auth: firebaseAuth, db: firestore } = requireFirebase()
    if (!firebaseAuth.currentUser) throw new Error('Sign in before sharing guidance.')
    const title = sanitizeCommunityText(input.title.trim())
    const text = sanitizeCommunityText(input.text.trim())
    if (!title || !text) throw new Error('Add a guide title and useful advice.')
    await setDoc(doc(collection(firestore, 'courseGuides')), { courseId: input.courseId, title, text, resources: input.resources?.trim() || '', createdAt: Date.now() })
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
      const snapshot = await getDocs(query(collection(firestore, 'courseQuestionNotifications'), where('questionId', '==', question.id), where('notificationKey', '==', notificationKey), orderBy('createdAt', 'desc')))
      return snapshot.docs.map(item => ({ id: item.id, questionId: String(item.data().questionId ?? ''), courseId: String(item.data().courseId ?? ''), title: String(item.data().title ?? 'Course update'), body: String(item.data().body ?? ''), read: item.data().read === true, createdAt: Number(item.data().createdAt ?? 0) }))
    }))
    return groups.flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async markQuestionNotificationRead(notificationId: string) {
    const { db: firestore } = requireFirebase()
    await setDoc(doc(firestore, 'courseQuestionNotifications', notificationId), { read: true }, { merge: true })
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
    if (user.role === 'admin') throw new Error('Administrator access cannot be changed from the app.')
    if (active && user.emailVerified === false) throw new Error('This member must verify their CUET email before the account can be activated.')
    const batch = writeBatch(firestore)
    batch.set(doc(firestore, 'users', user.id), { active, updatedAt: Date.now() }, { merge: true })
    if (user.role === 'teacher') {
      const directory = await getDoc(doc(firestore, 'teacherDirectory', user.id))
      if (directory.exists()) batch.set(directory.ref, { active, updatedAt: Date.now() }, { merge: true })
    }
    await batch.commit()
    return { ...user, active }
  },
  async createCourse(input: Omit<Course, 'id'>) {
    const { db: firestore } = requireFirebase()
    const value = { ...input, code: input.code.trim().toUpperCase(), title: input.title.trim(), department: input.department.trim().toUpperCase(), tags: input.tags.map(tag => tag.trim()).filter(Boolean), createdAt: Date.now(), updatedAt: Date.now() }
    if (!value.code || !value.title || !Number.isFinite(value.credits) || value.credits <= 0 || !value.teacherIds.length || !value.level || !value.term || !value.courseType) throw new Error('Course code, title, valid credits, CUET level, term, type, and at least one assigned teacher are required.')
    const ref = doc(collection(firestore, 'courses'))
    await setDoc(ref, value)
    return { id: ref.id, ...value }
  },
  async updateCourse(courseId: string, input: Omit<Course, 'id'>) {
    const { db: firestore } = requireFirebase()
    const value = { ...input, code: input.code.trim().toUpperCase(), title: input.title.trim(), department: input.department.trim().toUpperCase(), tags: input.tags.map(tag => tag.trim()).filter(Boolean), updatedAt: Date.now() }
    if (!value.code || !value.title || !Number.isFinite(value.credits) || value.credits <= 0 || !value.teacherIds.length || !value.level || !value.term || !value.courseType) throw new Error('Course code, title, valid credits, CUET level, term, type, and at least one assigned teacher are required.')
    await setDoc(doc(firestore, 'courses', courseId), value, { merge: true })
    return { id: courseId, ...value }
  },
  async deleteCourse(courseId: string) {
    const { db: firestore } = requireFirebase()
    await deleteDoc(doc(firestore, 'courses', courseId))
    const [reviews, questions, guides] = await Promise.all([
      getDocs(query(collection(firestore, 'courseReviews'), where('courseId', '==', courseId))),
      getDocs(query(collection(firestore, 'courseQuestions'), where('courseId', '==', courseId))),
      getDocs(query(collection(firestore, 'courseGuides'), where('courseId', '==', courseId))),
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
}

export const defaultRatings: RatingMap = { teachingQuality: 5, workload: 3, gradingFairness: 5, courseStructure: 5, availability: 5, difficulty: 3, learningValue: 5 }
