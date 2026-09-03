# Review summaries

Review summaries are handled by the optional separate `backend/` service—not by an Expo public endpoint or Firebase Cloud Function.

1. Set `EXPO_PUBLIC_BACKEND_URL` in the app `.env`.
2. Configure the backend’s `FIREBASE_SERVICE_ACCOUNT_JSON` so it can verify Firebase ID tokens and safely read authorised public reviews.
3. Optionally configure an OpenAI-compatible provider using `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in `backend/.env`.

The app sends the backend only a subject type and ID. The backend verifies the signed-in user and loads the relevant Firestore reviews itself. Raw review text, a Firebase service-account key, and an AI provider key are never bundled into the mobile app.

If no AI provider key is configured, the backend returns a transparent deterministic aggregate. If no backend URL is configured at all, the mobile app produces the same local aggregate for development. Neither fallback repeats individual review text.
