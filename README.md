# Bhorosha mobile app

Expo Router + TypeScript mobile implementation of Bhorosha, the privacy-first CUET course-feedback platform.

## Run locally

1. Copy `.env.example` to `.env` and add Firebase values, or leave it absent to use the safe local development fallback.
2. Run `npm install`.
3. Run `npm start`, then scan the QR code with Expo Go or choose an Android/iOS simulator.

The fallback is intentionally local-only and includes representative CSE courses/teachers. Firestore is used automatically when every `EXPO_PUBLIC_FIREBASE_*` value is configured.

## Firebase collections

- `users`: public profile metadata (never passwords)
- `courses`: admin-managed course catalogue with `teacherId` / `teacherName`
- `reviews`: course reviews with `authorId`, detailed ratings, and `anonymous`
- `professorReviews`: teacher reviews with `authorId`, rating, and `anonymous`

Deploy the supplied `firestore.rules` before production. Auth email/password must also be enabled in Firebase Authentication.
