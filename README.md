# Bhorosha App

> A privacy-first course and teacher feedback platform for the CUET community.

Bhorosha helps students make better academic decisions through structured, constructive feedback on courses and teachers. Reviews can be submitted anonymously, while teachers receive useful feedback without seeing students’ identities.

This repository contains the mobile-first frontend built with Expo and React Native. It also runs in a browser through Expo Web.

## Features

- Student, teacher, and admin experiences
- CUET-style sign-up and sign-in flows
- Browse and search courses and teachers
- Detailed multi-criteria course ratings
- Anonymous course and teacher reviews
- Course-specific anonymous Q&A
- Teacher dashboard, feedback feed, and response workflow
- Student activity history and profile settings
- Admin console for managing the local course catalogue
- Light/dark appearance support
- Responsive native mobile and web layouts
- Local demo mode for reviewing the complete frontend without Firebase

## Tech stack

- React Native + Expo SDK 54
- Expo Router
- TypeScript
- NativeWind / Tailwind CSS
- Expo Vector Icons (Feather)
- Firebase Authentication and Cloud Firestore support
- AsyncStorage for local demo data

## Getting started

### Prerequisites

- Node.js 18 or later
- npm
- Expo Go on Android/iOS, an emulator, or a modern web browser

### Installation

```bash
git clone https://github.com/Mahadia61/Bhorosha-App.git
cd Bhorosha-App
npm install --legacy-peer-deps
```

### Run the app

```bash
npm start -- --clear
```

From the Expo terminal:

- Press `w` to run on the web.
- Scan the displayed QR code with Expo Go to run on a physical device.
- Press `a` to open Android when an emulator is available.

If your phone cannot reach the local development server, use Expo tunnel mode:

```bash
npx expo start --tunnel --clear
```

## Demo mode

Firebase is optional while reviewing the frontend. Without a `.env` file, the app uses locally stored demo data. Use any password with these accounts:

| Account | Email | What you can test |
| --- | --- | --- |
| Student | `u123456@student.cuet.ac.bd` | Courses, reviews, teacher profiles, Q&A, activity |
| Teacher | `u1001@teacher.cuet.ac.bd` | Dashboard, student feedback, and answering course questions |
| Admin | `admin@bhorosha.local` | Local user list and course catalogue management |

You can also create new student or teacher accounts from the sign-up screen using a matching CUET email format.

## Firebase setup

To use Firebase instead of local demo mode, copy the example environment file:

```bash
copy .env.example .env
```

Fill in all `EXPO_PUBLIC_FIREBASE_*` values from your Firebase project, then:

1. Enable **Email/Password** in Firebase Authentication.
2. Create the Firestore collections below.
3. Deploy the included [Firestore security rules](./firestore.rules) before production.

### Firestore collections

| Collection | Purpose |
| --- | --- |
| `users` | Profile metadata only; Firebase Auth handles passwords |
| `courses` | Admin-managed course catalogue and teacher assignment |
| `reviews` | Course reviews, rating criteria, and anonymity preference |
| `professorReviews` | Teacher reviews, rating, and anonymity preference |
| `courseQuestions` | Anonymous course questions and teacher responses |

## Useful commands

```bash
# Start Expo
npm start

# Run the web version
npm run web

# Run on Android
npm run android

# Run on iOS
npm run ios

# Check TypeScript
npm run typecheck
```

## Project structure

```text
app/                 Expo Router screens and route layouts
components/          Reusable UI components
lib/                 Types, Firebase configuration, services, demo data
providers/           Shared application state
firestore.rules      Firestore authorization rules
```


## Security notes

- Never commit `.env` files or Firebase secrets.
- Authentication passwords are not stored in Firestore.
- Reviews store the author identifier only for authorization; anonymous reviews do not expose the author in the UI.
- Review and profile access should always use the supplied Firestore rules in a production deployment.

## License

This project is intended for academic and development use. Add a license file before distributing it publicly.
