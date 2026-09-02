# AI review summaries

The mobile app sends review text to `EXPO_PUBLIC_AI_SUMMARY_ENDPOINT` only when this value is set. Keep the model key on a Firebase Cloud Function, Cloud Run service, or another trusted backend—never in Expo public environment variables.

The endpoint accepts a JSON `POST` body:

```json
{ "subject": "your assigned courses", "reviews": [{ "text": "...", "ratings": { "teachingQuality": 4, "workload": 3, "gradingFairness": 4, "courseStructure": 4, "availability": 4 } }] }
```

It must return:

```json
{ "summary": "A short, constructive summary." }
```

Until an endpoint is configured, the button produces a clearly local, non-AI aggregate summary for frontend testing.
