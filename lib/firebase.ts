import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}
export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)
const app = firebaseEnabled ? (getApps().length ? getApp() : initializeApp(config)) : undefined
// Firebase Auth retains the platform-default session. Expo SecureStore/AsyncStorage can
// be added as a custom persistence adapter if a project needs explicit persistence.
export const auth = app ? getAuth(app) : undefined
export const db = app ? getFirestore(app) : undefined
export const storage = app ? getStorage(app) : undefined
