# Bhorosha

Bhorosha is a CUET-focused academic community app for discovering courses and
teachers, sharing reviews, asking questions, and connecting students with
reliable academic information.

The project contains:

- An Expo/React Native mobile and web app.
- Firebase Authentication and Firestore for accounts and academic data.
- Separate student, teacher, and administrator experiences.
- An optional Node.js/Express backend for profile-photo uploads, moderation
  warnings, and privacy-preserving AI review summaries.

## Features

### Students

- Sign up with email verification and manage a personal profile.
- Browse department courses and teacher profiles.
- Submit and edit course and teacher reviews.
- Ask course questions, read answers, and follow activity notifications.
- View review activity and aggregate feedback summaries.

### Teachers

- View assigned courses and course feedback.
- Answer student questions and respond to feedback.
- Review teaching insights and notifications.
- Maintain personal biography and profile photo details.

### Administrators

- Manage users, teacher profiles, courses, assignments, and moderation.
- View platform activity and analytics.
- Review reported content and manage account settings.

## Tech stack

- [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)
- TypeScript
- Expo Router
- Firebase Authentication and Cloud Firestore
- NativeWind/Tailwind CSS
- Node.js, Express, and Firebase Admin SDK (optional backend)
- Cloudinary (optional profile-photo hosting)

## Getting started

### Prerequisites

- Node.js 20 or newer
- npm
- Expo Go for testing on a physical device
- Java 17 only if running the Firestore emulator tests

### Install and run the app

```bash
npm install
npm run start
```

Useful Expo commands:

```bash
npm run android    # Start with a tunnel for a physical Android device
npm run ios        # Start the iOS simulator
npm run web        # Start the web build
```

The `android` script uses an Expo tunnel and does not require Android Studio,
the Android SDK, or `adb` on the development computer. Install Expo Go and scan
the QR code shown by Expo.

## Environment variables

Create a root `.env` file with the Firebase web configuration:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

The `EXPO_PUBLIC_*` values are bundled into the client. Do not place service
account credentials, API keys for private services, or other secrets in them.

Deploy Firestore rules and indexes before using a Firebase project:

```bash
npx firebase deploy --only firestore
```

Firebase Storage is intentionally disabled. Profile photos use the optional
backend and external image hosting instead.

## Optional backend

The mobile app works without the backend for authentication, courses, reviews,
Q&A, guides, and notifications. The backend is needed for profile-photo
uploads, identity-safe moderation warnings, and remote AI summaries.

Create `backend/.env` with:

```dotenv
FIREBASE_SERVICE_ACCOUNT_JSON={"project_id":"...","client_email":"...","private_key":"..."}
BACKEND_ALLOWED_ORIGINS=http://localhost:8081
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=gpt-4o-mini
```

Keep this file private and never commit it. Start the service from the project
root:

```bash
npm install --prefix backend
npm run dev --prefix backend
```

For a production deployment:

```bash
npm run build --prefix backend
npm start --prefix backend
```

Set `EXPO_PUBLIC_BACKEND_URL` in the app `.env` to the deployed backend URL.
The backend verifies Firebase ID tokens before serving protected operations.

## Validation

Run the app type checks:

```bash
npm run typecheck
npm run check --prefix backend
```

Run the Firestore-backed teacher assignment regression tests:

```bash
npm run test:teacher-assignments
```

The regression suite uses a local Firestore emulator and does not modify
production data. It requires Java 17 and downloads the pinned Firebase CLI and
emulator on first use.

## Project structure

```text
app/        Expo Router screens and role-based navigation
components/ Shared React Native components
lib/        Firebase integration, services, types, and domain logic
providers/  Application state providers
backend/    Optional Express service
tests/      Emulator-backed regression tests
firestore.rules
            Firestore security rules
storage.rules
            Explicitly denies Firebase Storage access
```

## Security notes

- Firestore rules enforce role- and department-aware access.
- Student accounts require verified email before protected access.
- The backend verifies Firebase ID tokens and authorizes access server-side.
- Raw review text and private service credentials are not sent to the AI
  provider by the mobile client.
- Never commit `.env` files, Firebase service-account JSON, or Cloudinary/API
  secrets.
