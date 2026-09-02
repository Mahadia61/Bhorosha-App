import AsyncStorage from '@react-native-async-storage/async-storage'
import { EmailAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as firebaseSignOut, updatePassword } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, firebaseEnabled, storage } from './firebase'
import { mockCourses, mockProfessors, mockProfiles } from './mock-data'
import { sanitizeCommunityText } from './content-filter'
import type { Course, CourseQuestion, Professor, ProfessorReview, Profile, QuestionAnswer, RatingMap, Review, Role } from './types'

const keys = {
  profiles: 'bhorosha.dev.profiles', session: 'bhorosha.dev.session', reviews: 'bhorosha.dev.reviews',
  professorReviews: 'bhorosha.dev.professor-reviews', questions: 'bhorosha.dev.course-questions', courses: 'bhorosha.dev.courses',
} as const

const read = async <T,>(key: string, fallback: T): Promise<T> => JSON.parse((await AsyncStorage.getItem(key)) ?? JSON.stringify(fallback)) as T
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value))
const normalizeEmail = (email: string) => email.trim().toLowerCase()
const profileFrom = (id: string, data: Record<string, unknown>): Profile => ({
  id, name: String(data.name ?? ''), email: String(data.email ?? ''), role: data.role as Role,
  department: String(data.department ?? 'CSE'), designation: data.designation ? String(data.designation) : undefined, photoUrl: data.photoUrl ? String(data.photoUrl) : undefined, darkMode: Boolean(data.darkMode), active: data.active !== false,
})
const localProfiles = () => read<Profile[]>(keys.profiles, mockProfiles)
const isStudentEmail = (email: string) => /^u\d+@student\.cuet\.ac\.bd$/.test(email)
const isTeacherEmail = (email: string) => /^u\d+@teacher\.cuet\.ac\.bd$/.test(email)
const localDemoPasswords: Record<string, string> = {
  'u123456@student.cuet.ac.bd': 'student@123',
  'u1001@teacher.cuet.ac.bd': 'teacher@123',
  'admin@gmail.com': 'admin@123',
}

async function firebaseProfile(userId: string): Promise<Profile | null> {
  if (!db) return null
  const snapshot = await getDoc(doc(db, 'users', userId))
  return snapshot.exists() ? profileFrom(snapshot.id, snapshot.data()) : null
}

const courseFrom = (id: string, data: Record<string, unknown>): Course => ({
  id, code: String(data.code ?? ''), title: String(data.title ?? ''), credits: Number(data.credits ?? 0), semester: String(data.semester ?? ''), department: String(data.department ?? ''),
  teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds.map(String) : data.teacherId ? [String(data.teacherId)] : [],
  teacherNames: Array.isArray(data.teacherNames) ? data.teacherNames.map(String) : data.teacherName ? [String(data.teacherName)] : [],
  tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
})

export const services = {
  firebaseEnabled,

  subscribeToSession(callback: (profile: Profile | null) => void) {
    if (firebaseEnabled && auth) {
      return onAuthStateChanged(auth, async user => callback(user ? await firebaseProfile(user.uid) : null))
    }
    void read<Profile | null>(keys.session, null).then(callback)
    return () => undefined
  },

  async session(): Promise<Profile | null> {
    if (firebaseEnabled && auth?.currentUser) return firebaseProfile(auth.currentUser.uid)
    return read<Profile | null>(keys.session, null)
  },

  async signUp(name: string, email: string, password: string, role: Role, department: string, designation?: string): Promise<Profile> {
    const normalized = normalizeEmail(email)
    if (role === 'admin') throw new Error('Administrator accounts are provisioned by Firebase administrators.')
    if (!name.trim()) throw new Error('Please enter your full name.')
    if (password.length < 8) throw new Error('Use a password with at least 8 characters.')
    if (role === 'student' && !isStudentEmail(normalized)) throw new Error('Use u{ID}@student.cuet.ac.bd for a student account.')
    if (role === 'teacher' && !isTeacherEmail(normalized)) throw new Error('Use u{ID}@teacher.cuet.ac.bd for a teacher account.')
    if (role === 'teacher' && !designation?.trim()) throw new Error('Choose your teaching position.')

    if (firebaseEnabled && auth && db) {
      const credential = await createUserWithEmailAndPassword(auth, normalized, password)
      const profile: Record<string, unknown> = { name: name.trim(), email: normalized, role, department: department.trim().toUpperCase(), darkMode: false, active: true }
      if (role === 'teacher' && designation?.trim()) profile.designation = designation.trim()
      await setDoc(doc(db, 'users', credential.user.uid), profile)
      return profileFrom(credential.user.uid, profile)
    }

    const profiles = await localProfiles()
    if (profiles.some(profile => profile.email === normalized)) throw new Error('An account already exists for this email.')
    const profile: Profile = { id: `local-${Date.now()}`, name: name.trim(), email: normalized, role, department: department.trim().toUpperCase(), designation: role === 'teacher' ? designation?.trim() : undefined, darkMode: false, active: true }
    await write(keys.profiles, [...profiles, profile]); await write(keys.session, profile)
    return profile
  },

  async signIn(email: string, password: string): Promise<Profile> {
    const normalized = normalizeEmail(email)
    if (!normalized || !password) throw new Error('Enter both email and password.')
    if (firebaseEnabled && auth) {
      const credential = await signInWithEmailAndPassword(auth, normalized, password)
      const profile = await firebaseProfile(credential.user.uid)
      if (!profile) throw new Error('Your account profile is not set up. Ask an administrator to create it.')
      if (profile.active === false) { await firebaseSignOut(auth); throw new Error('This account has been suspended. Contact an administrator.') }
      return profile
    }

    // Offline mode exists only to demonstrate the frontend. Never use this path in production.
    if (localDemoPasswords[normalized] && password !== localDemoPasswords[normalized]) throw new Error('Incorrect email or password.')
    const profile = (await localProfiles()).find(value => value.email === normalized)
    if (!profile) throw new Error('No local account found. Create a student or teacher account first.')
    if (profile.active === false) throw new Error('This account has been suspended. Contact an administrator.')
    if (profile.role === 'admin' && normalized !== 'admin@gmail.com') throw new Error('Invalid administrator account.')
    await write(keys.session, profile)
    return profile
  },

  async requestPasswordReset(email: string) {
    const normalized = normalizeEmail(email)
    if (!normalized) throw new Error('Enter your email address first.')
    if (firebaseEnabled && auth) {
      await sendPasswordResetEmail(auth, normalized)
      return
    }
    throw new Error('Password reset email is available after Firebase Authentication is configured. Local demo accounts use the credentials in the README.')
  },

  async changePassword(currentPassword: string, nextPassword: string) {
    if (nextPassword.length < 8) throw new Error('Use a new password with at least 8 characters.')
    if (!firebaseEnabled || !auth?.currentUser || !auth.currentUser.email) throw new Error('Password changes are available after Firebase Authentication is configured.')
    const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(auth.currentUser, credential)
    await updatePassword(auth.currentUser, nextPassword)
  },

  async uploadProfilePhoto(userId: string, uri: string) {
    if (!firebaseEnabled || !storage) return uri
    const response = await fetch(uri)
    const file = await response.blob()
    const imageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}.jpg`)
    await uploadBytes(imageRef, file, { contentType: file.type || 'image/jpeg' })
    return getDownloadURL(imageRef)
  },

  async signOut() { if (firebaseEnabled && auth) await firebaseSignOut(auth); await AsyncStorage.removeItem(keys.session) },

  async updateProfile(profile: Profile) {
    const value: Record<string, unknown> = { name: profile.name.trim(), email: profile.email, role: profile.role, department: profile.department, darkMode: Boolean(profile.darkMode), active: profile.active !== false }
    if (profile.designation) value.designation = profile.designation
    if (profile.photoUrl) value.photoUrl = profile.photoUrl
    if (firebaseEnabled && db) { await setDoc(doc(db, 'users', profile.id), value, { merge: true }); return profileFrom(profile.id, value) }
    const profiles = await localProfiles(); const next = profiles.map(item => item.id === profile.id ? { ...profile, ...value } : item)
    await write(keys.profiles, next); await write(keys.session, { ...profile, ...value }); return { ...profile, ...value }
  },

  async courses(): Promise<Course[]> {
    if (!firebaseEnabled || !db) {
      const local = await read<Record<string, unknown>[]>(keys.courses, mockCourses)
      return local.map(item => courseFrom(String(item.id), item)).sort((a, b) => a.code.localeCompare(b.code))
    }
    const snapshot = await getDocs(collection(db, 'courses'))
    return snapshot.docs.map(item => courseFrom(item.id, item.data())).sort((a, b) => a.code.localeCompare(b.code))
  },
  async course(id: string) { return (await this.courses()).find(course => course.id === id) ?? null },

  async professors(): Promise<Professor[]> {
    if (!firebaseEnabled || !db) return mockProfessors
    const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'teacher')))
    return snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name), department: String(item.data().department), designation: item.data().designation ? String(item.data().designation) : undefined, bio: item.data().bio ? String(item.data().bio) : undefined }))
  },

  async reviews(courseId: string): Promise<Review[]> {
    if (!firebaseEnabled || !db) return (await read<Review[]>(keys.reviews, [])).filter(review => review.courseId === courseId).sort((a, b) => b.createdAt - a.createdAt)
    const snapshot = await getDocs(query(collection(db, 'reviews'), where('courseId', '==', courseId)))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Review)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async addReview(input: Omit<Review, 'id' | 'createdAt'>) {
    const value = { ...input, text: sanitizeCommunityText(input.text.trim()), createdAt: Date.now() }
    if (!value.text) throw new Error('Review text is required.')
    if (firebaseEnabled && db) { await addDoc(collection(db, 'reviews'), value); return }
    await write(keys.reviews, [...await read<Review[]>(keys.reviews, []), { ...value, id: `review-${Date.now()}` }])
  },
  async myReviews(authorId: string) {
    if (!firebaseEnabled || !db) return (await read<Review[]>(keys.reviews, [])).filter(review => review.authorId === authorId).sort((a, b) => b.createdAt - a.createdAt)
    const snapshot = await getDocs(query(collection(db, 'reviews'), where('authorId', '==', authorId)))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Review)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async allReviews(): Promise<Review[]> {
    if (!firebaseEnabled || !db) return read<Review[]>(keys.reviews, [])
    const snapshot = await getDocs(collection(db, 'reviews'))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Review)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async deleteReview(reviewId: string) {
    if (firebaseEnabled && db) { await deleteDoc(doc(db, 'reviews', reviewId)); return }
    await write(keys.reviews, (await read<Review[]>(keys.reviews, [])).filter(review => review.id !== reviewId))
  },

  async professorReviews(professorId: string): Promise<ProfessorReview[]> {
    if (!firebaseEnabled || !db) return (await read<ProfessorReview[]>(keys.professorReviews, [])).filter(review => review.professorId === professorId).sort((a, b) => b.createdAt - a.createdAt)
    const snapshot = await getDocs(query(collection(db, 'professorReviews'), where('professorId', '==', professorId)))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as ProfessorReview)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async addProfessorReview(input: Omit<ProfessorReview, 'id' | 'createdAt'>) {
    const value = { ...input, text: sanitizeCommunityText(input.text.trim()), createdAt: Date.now() }
    if (!value.text) throw new Error('Review text is required.')
    if (firebaseEnabled && db) { await addDoc(collection(db, 'professorReviews'), value); return }
    await write(keys.professorReviews, [...await read<ProfessorReview[]>(keys.professorReviews, []), { ...value, id: `prof-review-${Date.now()}` }])
  },

  async courseQuestions(courseId: string): Promise<CourseQuestion[]> {
    if (!firebaseEnabled || !db) return (await read<CourseQuestion[]>(keys.questions, [])).filter(question => question.courseId === courseId).sort((a, b) => b.createdAt - a.createdAt)
    const snapshot = await getDocs(query(collection(db, 'courseQuestions'), where('courseId', '==', courseId)))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as CourseQuestion)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async addCourseQuestion(input: Omit<CourseQuestion, 'id' | 'createdAt' | 'answers'>) {
    const value = { ...input, text: sanitizeCommunityText(input.text.trim()), createdAt: Date.now(), answers: [] as QuestionAnswer[] }
    if (!value.text) throw new Error('Question text is required.')
    if (firebaseEnabled && db) { await addDoc(collection(db, 'courseQuestions'), value); return }
    await write(keys.questions, [...await read<CourseQuestion[]>(keys.questions, []), { ...value, id: `question-${Date.now()}` }])
  },
  async teacherQuestions(teacherId: string): Promise<CourseQuestion[]> {
    const assignedCourses = (await this.courses()).filter(course => course.teacherIds.includes(teacherId))
    const all = await Promise.all(assignedCourses.map(course => this.courseQuestions(course.id)))
    return all.flat().sort((a, b) => b.createdAt - a.createdAt)
  },
  async allCourseQuestions(): Promise<CourseQuestion[]> {
    if (!firebaseEnabled || !db) return read<CourseQuestion[]>(keys.questions, [])
    const snapshot = await getDocs(collection(db, 'courseQuestions'))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as CourseQuestion)).sort((a, b) => b.createdAt - a.createdAt)
  },
  async deleteCourseQuestion(questionId: string) {
    if (firebaseEnabled && db) { await deleteDoc(doc(db, 'courseQuestions', questionId)); return }
    await write(keys.questions, (await read<CourseQuestion[]>(keys.questions, [])).filter(question => question.id !== questionId))
  },
  async addQuestionAnswer(questionId: string, author: Profile, text: string) {
    const answerText = sanitizeCommunityText(text.trim()); if (!answerText) throw new Error('Answer text is required.')
    const answer: QuestionAnswer = { id: `answer-${Date.now()}`, authorId: author.id, authorName: author.role === 'student' ? 'A student' : author.name, authorRole: author.role === 'teacher' ? 'teacher' : 'student', text: answerText, createdAt: Date.now() }
    if (firebaseEnabled && db) {
      const question = await getDoc(doc(db, 'courseQuestions', questionId)); if (!question.exists()) throw new Error('Question no longer exists.')
      const current = Array.isArray(question.data().answers) ? question.data().answers as QuestionAnswer[] : []
      await setDoc(doc(db, 'courseQuestions', questionId), { answers: [...current, answer] }, { merge: true }); return
    }
    const questions = await read<CourseQuestion[]>(keys.questions, []); await write(keys.questions, questions.map(question => question.id === questionId ? { ...question, answers: [...(question.answers ?? []), answer] } : question))
  },

  async adminUsers(): Promise<Profile[]> {
    if (!firebaseEnabled || !db) return localProfiles()
    const snapshot = await getDocs(collection(db, 'users')); return snapshot.docs.map(item => profileFrom(item.id, item.data()))
  },
  async updateUserStatus(user: Profile, active: boolean) {
    if (user.role === 'admin') throw new Error('Administrator access cannot be changed from the app.')
    if (firebaseEnabled && db) { await setDoc(doc(db, 'users', user.id), { active }, { merge: true }); return { ...user, active } }
    const profiles = await localProfiles(); const next = profiles.map(item => item.id === user.id ? { ...item, active } : item)
    await write(keys.profiles, next)
    return { ...user, active }
  },
  async createCourse(input: Omit<Course, 'id'>) {
    const value = { ...input, code: input.code.trim().toUpperCase(), title: input.title.trim(), teacherIds: input.teacherIds, teacherNames: input.teacherNames, createdAt: Date.now() }
    if (!value.code || !value.title || !value.teacherIds.length) throw new Error('Course code, title, and at least one assigned teacher are required.')
    if (firebaseEnabled && db) { const created = await addDoc(collection(db, 'courses'), value); return { id: created.id, ...input } }
    const course = { ...input, id: `course-${Date.now()}` }; await write(keys.courses, [...await this.courses(), course]); return course
  },
  async updateCourse(courseId: string, input: Omit<Course, 'id'>) {
    const value = { ...input, code: input.code.trim().toUpperCase(), title: input.title.trim(), teacherIds: input.teacherIds, teacherNames: input.teacherNames, tags: input.tags.map(tag => tag.trim()).filter(Boolean) }
    if (!value.code || !value.title || !value.teacherIds.length) throw new Error('Course code, title, and at least one assigned teacher are required.')
    if (firebaseEnabled && db) { await setDoc(doc(db, 'courses', courseId), value, { merge: true }); return { id: courseId, ...value } }
    const next = (await this.courses()).map(course => course.id === courseId ? { id: courseId, ...value } : course)
    await write(keys.courses, next)
    return { id: courseId, ...value }
  },
  async deleteCourse(courseId: string) {
    if (firebaseEnabled && db) {
      const [reviews, questions] = await Promise.all([getDocs(query(collection(db, 'reviews'), where('courseId', '==', courseId))), getDocs(query(collection(db, 'courseQuestions'), where('courseId', '==', courseId)))])
      if (reviews.size + questions.size + 1 > 500) throw new Error('Course has too much related content for a mobile deletion. Archive it from an admin tool instead.')
      const batch = writeBatch(db); batch.delete(doc(db, 'courses', courseId)); reviews.docs.forEach(item => batch.delete(item.ref)); questions.docs.forEach(item => batch.delete(item.ref)); await batch.commit(); return
    }
    await write(keys.courses, (await this.courses()).filter(course => course.id !== courseId))
  },
  async resetDemoData() {
    if (firebaseEnabled) throw new Error('Demo reset is available only when Firebase is not configured.')
    await Promise.all([AsyncStorage.removeItem(keys.reviews), AsyncStorage.removeItem(keys.professorReviews), AsyncStorage.removeItem(keys.questions), AsyncStorage.removeItem(keys.courses)])
  },
}

export const defaultRatings: RatingMap = { teachingQuality: 5, workload: 3, gradingFairness: 5, courseStructure: 5, availability: 5 }
