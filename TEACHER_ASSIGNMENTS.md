# Teacher profiles and course assignments

## Deploying this change

Deploy `firestore.rules` together with this app update (`firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`). The current rules are required before the new profile and linking screens can work. Deploy the backend update too if the separate backend is used for teacher AI summaries. No production data or rules are changed by the local regression tests.

Open **Members → Teachers** as an administrator once after deploying. Existing teacher accounts are imported automatically and idempotently using their existing UID as the teacher profile ID. Course IDs, existing assignment IDs, review IDs and Q&A records are preserved. Opening the course form also performs this compatibility import. The first management action records the existing accounts for migration; later signups do not automatically create duplicate profiles. Admins create those profiles or add the email to an existing email-less profile.

## Admin workflow

1. Open **Members → Teachers → Add Teacher Profile**.
2. Enter full name, department, designation and optional email. This creates a profile, not an authentication account or password.
3. Create or edit a course and select any number of teacher profiles. The course form also supports adding a new teacher profile without losing the course draft. Uncheck teachers to remove them; a course can be left unassigned.
4. Use **Edit Teacher** to update the profile. Linked status appears on each teacher card. A linked email is fixed to preserve the account relationship.

An email-less profile can receive courses immediately. Add the account email when it becomes available. Emails are normalized and cannot belong to two teacher profiles; names are never used for automatic matching.

## Login and permissions

Teacher signup and login retain the existing CUET teacher email format. A teacher who signs in with the profile's verified Firebase Auth email is linked automatically. If the email has not been verified, a notice on the teacher dashboard and My Courses opens the existing verification screen. Use its verification email button, open the email link, then select **I verified my email**. The assigned courses become available without reassignment.

Existing imported teachers retain their established access and do not need to repeat verification. Account IDs remain distinct from profile IDs throughout authentication and private user data.

Credentials provisioned in Firebase Authentication without a `users` record can also sign in: the matching admin teacher profile supplies the initial app account details, followed by the same verified-email linking check.

Admins manage the official teacher records, course information and assignments. Teachers can read assigned courses, their course reviews and Q&A, post answers and respond to feedback. Teachers cannot create or edit courses, change assignments, or claim another teacher's profile. Personal biography and photo editing remain available without replacing the admin's official teacher name, department or designation.

## Database records

- `teacherProfiles/{profileId}`: private `name`, `department`, `designation`, `email`, `linkedUserId` (nullable).
- `teacherProfileEmails/{normalizedEmail}`: private unique lookup containing `teacherProfileId`.
- `teacherProfileMigrations/v1`: private, immutable list of preexisting teacher account IDs to import idempotently; later signups remain admin-managed.
- `users/{uid}.teacherProfileId`: linked profile identity; set atomically with `linkedUserId` and protected against teacher reassignment.
- `teacherDirectory/{profileId}`: existing public teacher directory schema; contains no email or linking metadata.
- `courses/{courseId}.teacherIds`: teacher profile IDs. Existing UID-based IDs remain valid for compatibility; multiple IDs support multiple teachers per course.

Course teacher names are resolved from the public directory when loaded, so editing a teacher's name updates the displayed course names. Reviews and questions continue to use their existing `courseId`. Notifications addressed to a profile before login are available after linking.

## Regression checks

Run `npm run typecheck`, `npm --prefix backend run check`, and `npm run test:teacher-assignments`.

The last command runs a local Firestore emulator against `demo-bhorosha-teachers` on port 8180. It requires Java 17 and downloads the pinned Firebase CLI/emulator on first use. It never connects to a production Firestore database. Tests execute the actual profile and service transactions with emulator-backed Firebase connections and cover pre-login assignment, verified linking, rejected claims, multiple teachers, assignment removal, student feedback/Q&A, notifications, optional email, legacy imports, and personal profile editing.
