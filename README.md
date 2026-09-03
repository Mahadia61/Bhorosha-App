# Bhorosha App

Bhorosha is a privacy-first CUET course and teacher feedback app. Students can review courses and teachers, ask course questions, and follow their activity. Teachers see assigned-course feedback and answer questions. Administrators manage catalogue data, members, and moderation.

This release uses the **Firebase Spark plan** for Firebase Authentication and Cloud Firestore. It contains no seeded accounts, demo credentials, local mock records, or Firebase Cloud Functions dependency.

## Features

- Separate student, teacher, and admin navigation and permissions
- CUET email sign-up, sign-in, password reset, and protected routes
- Course catalogue with search, tags, many-to-many teacher assignment, and details
- Anonymous course/teacher reviews with structured ratings
- Anonymous course Q&A; students and assigned teachers can answer
- Private teacher-response notifications in the student activity feed
- Bangla and English disrespectful-word masking before a contribution is saved
- Teacher feedback dashboard and profile settings
- Admin overview, course management, members, moderation, and analytics
- Light/dark mode, loading, empty, and error states
- Firestore rules that keep author identity in private user mirrors—not public feedback documents—and restrict teachers to assigned-course feedback
- Student course guides, report queue, teacher responses to reviews, optional AI summaries, and identity-safe account warnings

## Architecture

```text
Expo mobile app ── Firebase Auth + Firestore (Spark)
       │
       └── optional separate Node backend ── external image host / AI provider / identity-safe account warnings
```

The app writes privacy-safe public documents and matching private user mirrors in Firestore batches. Firestore rules require both documents, validate role/department constraints, and prevent clients from reading another member’s private mirror.

Firebase Storage and Firebase Cloud Functions are intentionally not used because both require the Blaze plan. The optional `backend/` service handles profile images, review summaries, and identity-safe warnings outside Firebase.

## Prerequisites

- Node.js 20 or later
- Expo Go, Android emulator, or a web browser
- Firebase project on the Spark plan with Email/Password Authentication and Firestore enabled
- Optional: a separately hosted Node backend plus a free Cloudinary account for teacher profile images

## Setup

```bash
git clone https://github.com/Mahadia61/Bhorosha-App.git
cd Bhorosha-App
npm install
copy .env.example .env
```

Fill in your Firebase Web App values in `.env`. Then deploy the Firestore policy and indexes:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

Detailed Firebase and backend setup is in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md). The collection model is documented in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), and the optional backend contract is in [API.md](./API.md).

## Run

```bash
npm start -- --clear
```

- Press `w` for web.
- Scan the Expo QR code with Expo Go for Android/iOS.
- If the phone cannot reach Metro, run `npx expo start --tunnel --clear`.

## Separate backend (optional photos, summaries, and account warnings)

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set `EXPO_PUBLIC_BACKEND_URL` in the app’s `.env` to the backend’s reachable HTTPS URL, then restart Expo. The backend verifies a Firebase ID token before accepting a request. It requires a server-only Firebase service account; do not commit that key or add it to an Expo environment variable.

Without the separate backend:

- teacher image upload reports a clear configuration message;
- review summaries use a transparent local aggregate, with no review data sent to any third party.
- administrators can keep or remove reported content, but cannot issue an account warning without exposing anonymous ownership.

## Quality checks

```bash
npm run typecheck
npm --prefix backend run check
npx expo export --platform web
npx expo export --platform android
```

## Security notes

- Firebase Auth owns passwords; Firestore never stores them.
- Admin accounts are provisioned manually with the Firebase Console/Admin SDK; app users cannot create an admin profile.
- Do not expose `FIREBASE_SERVICE_ACCOUNT_JSON`, Cloudinary credentials, or an AI provider key in `.env` for Expo.
- Before production, create a strong administrator password and configure Firebase’s authorized domains.
