# Bhorosha-App

## Run the Expo app

```powershell
npm install
npm run start
```

For a physical Android device, start Expo with a reachable tunnel:

```powershell
npm run android
```

The Android command uses `--tunnel` because `localhost` and many LAN
addresses are not reachable from a physical phone. It intentionally does not
use the `--android` flag, so it does not require Android Studio, an Android
SDK, or `adb` on the development computer. Make sure the latest Expo Go app
is installed, then scan the QR code shown by Expo.

The app reads Firebase web configuration from `.env` using the
`EXPO_PUBLIC_FIREBASE_*` variables. Deploy the Firestore rules and indexes with:

```powershell
npx firebase deploy --only firestore
```

## Optional backend

The Expo app does not require the backend for Firebase authentication, courses,
reviews, Q&A, guides, or notifications. The backend is required for teacher
profile-photo uploads, identity-safe moderation warnings, and remote AI
summaries. Run it from `backend` after configuring `FIREBASE_SERVICE_ACCOUNT_JSON`,
`BACKEND_ALLOWED_ORIGINS`, and the Cloudinary variables:

```powershell
npm install --prefix backend
npm run dev --prefix backend
```

Set `EXPO_PUBLIC_BACKEND_URL` in `.env` to the deployed backend URL when using
those features.
