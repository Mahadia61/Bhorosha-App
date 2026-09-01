import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth, db, firebaseEnabled } from './firebase'
import { mockCourses, mockProfessors } from './mock-data'
import type { Course, Professor, ProfessorReview, Profile, RatingMap, Review, Role } from './types'

const profilesKey = 'bhorosha.dev.profiles'; const sessionKey = 'bhorosha.dev.session'; const reviewsKey = 'bhorosha.dev.reviews'; const professorReviewsKey = 'bhorosha.dev.professor-reviews'
const read = async <T,>(key: string, fallback: T): Promise<T> => JSON.parse((await AsyncStorage.getItem(key)) ?? JSON.stringify(fallback)) as T
const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value))
const profileFrom = (id: string, data: Record<string, unknown>): Profile => ({ id, name: String(data.name), email: String(data.email), role: data.role as Role, department: String(data.department ?? 'CSE'), darkMode: Boolean(data.darkMode) })

export const services = {
  firebaseEnabled,
  async session(): Promise<Profile | null> { if (firebaseEnabled && auth?.currentUser && db) { const snap = await getDoc(doc(db, 'users', auth.currentUser.uid)); return snap.exists() ? profileFrom(snap.id, snap.data()) : null } return read<Profile | null>(sessionKey, null) },
  async signUp(name: string, email: string, password: string, role: Role, department: string): Promise<Profile> {
    if (firebaseEnabled && auth && db) { const credential = await createUserWithEmailAndPassword(auth, email, password); const profile = { name, email, role, department, darkMode: false }; await setDoc(doc(db, 'users', credential.user.uid), profile); return profileFrom(credential.user.uid, profile) }
    const profiles = await read<Profile[]>(profilesKey, []); if (profiles.some(item => item.email.toLowerCase() === email.toLowerCase())) throw new Error('An account already exists for this email.')
    const profile: Profile = { id: `local-${Date.now()}`, name, email, role, department, darkMode: false }; await write(profilesKey, [...profiles, profile]); await write(sessionKey, profile); return profile
  },
  async signIn(email: string, password: string): Promise<Profile> {
    if (firebaseEnabled && auth && db) { const credential = await signInWithEmailAndPassword(auth, email, password); const snap = await getDoc(doc(db, 'users', credential.user.uid)); if (!snap.exists()) throw new Error('Your Bhorosha profile is missing.'); return profileFrom(snap.id, snap.data()) }
    const profiles = await read<Profile[]>(profilesKey, []); const existing = profiles.find(item => item.email.toLowerCase() === email.toLowerCase()); const profile = existing ?? { id: 'demo-student', name: 'CUET Student', email, role: 'student' as Role, department: 'CSE', darkMode: false }; await write(sessionKey, profile); return profile
  },
  async signOut() { if (firebaseEnabled && auth) await firebaseSignOut(auth); await AsyncStorage.removeItem(sessionKey) },
  async updateProfile(profile: Profile) { if (firebaseEnabled && db) await setDoc(doc(db, 'users', profile.id), { name: profile.name, email: profile.email, role: profile.role, department: profile.department, darkMode: profile.darkMode }, { merge: true }); else { const profiles = await read<Profile[]>(profilesKey, []); await write(profilesKey, profiles.map(p => p.id === profile.id ? profile : p)); await write(sessionKey, profile) }; return profile },
  async courses(): Promise<Course[]> { if (!firebaseEnabled || !db) return mockCourses; const data = await getDocs(collection(db, 'courses')); return data.docs.map(s => ({ id: s.id, ...s.data() } as Course)) },
  async course(id: string) { return (await this.courses()).find(item => item.id === id) ?? null },
  async professors(): Promise<Professor[]> { if (!firebaseEnabled || !db) return mockProfessors; const q = query(collection(db, 'users'), where('role', '==', 'teacher')); const data = await getDocs(q); return data.docs.map(s => ({ id: s.id, ...s.data() } as Professor)) },
  async reviews(courseId: string): Promise<Review[]> { if (!firebaseEnabled || !db) return (await read<Review[]>(reviewsKey, [])).filter(item => item.courseId === courseId).sort((a,b) => b.createdAt-a.createdAt); const data = await getDocs(query(collection(db, 'reviews'), where('courseId', '==', courseId))); return data.docs.map(s => ({ id: s.id, ...s.data() } as Review)).sort((a,b) => b.createdAt - a.createdAt) },
  async addReview(input: Omit<Review, 'id' | 'createdAt'>) { const value = { ...input, createdAt: Date.now() }; if (firebaseEnabled && db) await addDoc(collection(db, 'reviews'), value); else await write(reviewsKey, [...await read<Review[]>(reviewsKey, []), { ...value, id: `review-${Date.now()}` }]) },
  async professorReviews(professorId: string): Promise<ProfessorReview[]> { if (!firebaseEnabled || !db) return (await read<ProfessorReview[]>(professorReviewsKey, [])).filter(item => item.professorId === professorId).sort((a,b) => b.createdAt-a.createdAt); const data = await getDocs(query(collection(db, 'professorReviews'), where('professorId', '==', professorId))); return data.docs.map(s => ({ id: s.id, ...s.data() } as ProfessorReview)).sort((a,b) => b.createdAt - a.createdAt) },
  async addProfessorReview(input: Omit<ProfessorReview, 'id' | 'createdAt'>) { const value = { ...input, createdAt: Date.now() }; if (firebaseEnabled && db) await addDoc(collection(db, 'professorReviews'), value); else await write(professorReviewsKey, [...await read<ProfessorReview[]>(professorReviewsKey, []), { ...value, id: `prof-review-${Date.now()}` }]) },
  async myReviews(userId: string) { if (firebaseEnabled && db) { const data = await getDocs(query(collection(db, 'reviews'), where('authorId', '==', userId))); return data.docs.map(s => ({ id: s.id, ...s.data() } as Review)).sort((a,b) => b.createdAt - a.createdAt) }; return (await read<Review[]>(reviewsKey, [])).filter(item => item.authorId === userId) },
}
export const defaultRatings: RatingMap = { teachingQuality: 5, workload: 3, gradingFairness: 5, courseStructure: 5, availability: 5 }
