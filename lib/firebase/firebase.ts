import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
// Fail closed when a public Firebase setting is missing, rather than starting
// a partial SDK configuration that later fails on a login or Firestore call.
export const firebaseEnabled = Boolean(
  config.apiKey &&
  config.authDomain &&
  config.projectId &&
  config.messagingSenderId &&
  config.appId,
);
const app = firebaseEnabled
  ? getApps().length
    ? getApp()
    : initializeApp(config)
  : undefined;
export const auth = app ? getAuth(app) : undefined;
export const db = app ? getFirestore(app) : undefined;
