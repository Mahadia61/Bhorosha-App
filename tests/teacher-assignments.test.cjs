const { before, beforeEach, after, test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing')
const { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, writeBatch } = require('firebase/firestore')

let env
const root = path.resolve(__dirname, '..')
const account = (id, role = 'teacher', email = 'teacher1@cuet.ac.bd') => ({ id, name: id, email, role, department: 'CSE', designation: 'Lecturer', darkMode: false, active: true, emailVerified: true })
const teacherInput = (email = 'teacher1@cuet.ac.bd') => ({ name: 'Admin Teacher Name', department: 'CSE', designation: 'Professor', email })
const courseInput = teacher => ({ code: 'CSE 101', title: 'Course', credits: 3, department: 'CSE', level: '1', term: '1', courseType: 'Theory', teacherIds: [teacher.id], teacherNames: [teacher.name], tags: [], status: 'active' })
const ratings = { teachingQuality: 5, workload: 3, gradingFairness: 4, courseStructure: 5, availability: 4, difficulty: 3, learningValue: 5 }

// Load the production TypeScript services with only their Firebase connection
// replaced. All reads, transactions and writes still run against real rules.
function client(id, email = 'teacher1@cuet.ac.bd', verified = true) {
  const db = env.authenticatedContext(id, { email, email_verified: verified }).firestore()
  const firebase = { db, firebaseEnabled: true, auth: { currentUser: { uid: id, email, emailVerified: verified } } }
  const cache = new Map()
  function load(file) {
    file = path.resolve(root, file)
    if (cache.has(file)) return cache.get(file).exports
    const instance = new Module(file, module)
    cache.set(file, instance)
    instance.filename = file
    instance.paths = module.paths
    instance.require = specifier => {
      const normalized = specifier.replace(/\\/g, '/')
      if (normalized === './firebase' || normalized.endsWith('/firebase/firebase')) return firebase
      if (specifier.startsWith('.') && !specifier.endsWith('.json')) return load(path.resolve(path.dirname(file), specifier + '.ts'))
      return Module.createRequire(file)(specifier)
    }
    instance._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
    return instance.exports
  }
  return { db, ...load('lib/services/teacher-profiles.ts'), services: load('lib/services/services.ts').services }
}
async function seed(records) {
  await env.withSecurityRulesDisabled(async context => {
    await Promise.all(Object.entries(records).map(([key, value]) => setDoc(doc(context.firestore(), key), value)))
  })
}
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-bhorosha-teachers', firestore: { rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8') } })
})
beforeEach(async () => { await env.clearFirestore(); await seed({ 'users/admin': account('admin', 'admin', 'admin@example.com') }) })
after(async () => { await env?.cleanup() })

test('admin creates and assigns a profile before login; unverified teacher login reveals all assigned courses', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput())
  assert.equal(teacher.linkedUserId, null)
  assert.equal((await getDocs(collection(admin.db, 'users'))).size, 1)
  const first = await admin.services.createCourse(courseInput(teacher))
  const second = await admin.services.createCourse({ ...courseInput(teacher), code: 'CSE 102' })
  await seed({ 'users/teacher': account('teacher') })
  const teacherClient = client('teacher', 'teacher1@cuet.ac.bd', false)
  const linked = await teacherClient.linkTeacherAccount(account('teacher'))
  assert.equal(linked.teacherProfileId, teacher.id)
  assert.equal((await getDoc(doc(admin.db, 'teacherProfiles', teacher.id))).data().linkedUserId, 'teacher')
  assert.deepEqual((await teacherClient.services.courses()).map(course => course.id).sort(), [first.id, second.id].sort())
  assert.equal((await teacherClient.linkTeacherAccount(linked)).teacherProfileId, teacher.id)
  await admin.saveTeacherProfile({ ...teacherInput(), name: 'Updated Official Name' }, teacher.id)
  assert.equal((await teacherClient.services.courses())[0].teacherNames[0], 'Updated Official Name')
})

test('unverified teacher can link by matching email; wrong-email and student accounts cannot claim profiles', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput())
  const course = await admin.services.createCourse(courseInput(teacher))
  await seed({ 'users/pending': account('pending'), 'users/stranger': account('stranger', 'teacher', 'teacher2@cuet.ac.bd'), 'users/student': account('student', 'student', 'u1@student.cuet.ac.bd') })
  const pending = client('pending', 'teacher1@cuet.ac.bd', false)
  const linked = await pending.linkTeacherAccount(account('pending'))
  assert.equal(linked.teacherProfileId, teacher.id)
  assert.deepEqual((await pending.services.courses()).map(item => item.id), [course.id])
  for (const [id, email, verified] of [['stranger', 'teacher2@cuet.ac.bd', true], ['student', 'u1@student.cuet.ac.bd', true]]) {
    const user = client(id, email, verified)
    const batch = writeBatch(user.db)
    batch.update(doc(user.db, 'users', id), { teacherProfileId: teacher.id, updatedAt: Date.now() })
    batch.update(doc(user.db, 'teacherProfiles', teacher.id), { linkedUserId: id })
    await assertFails(batch.commit())
    await assertFails(setDoc(doc(user.db, 'teacherProfileEmails', email), { teacherProfileId: teacher.id }))
  }
  const verified = client('pending')
  await verified.linkTeacherAccount(account('pending'))
  await assertFails(updateDoc(doc(verified.db, 'users', 'pending'), { teacherProfileId: 'someone-else', updatedAt: Date.now() }))
  await assertFails(updateDoc(doc(verified.db, 'teacherProfiles', teacher.id), { linkedUserId: null }))
  await seed({ 'users/duplicate': account('duplicate') })
  await assert.rejects(client('duplicate').linkTeacherAccount(account('duplicate')), /already linked/)
})

test('provisioned login credentials get an app account from the admin profile without prior signup', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput())
  const course = await admin.services.createCourse(courseInput(teacher))
  const teacherClient = client('provisioned')
  await teacherClient.ensureTeacherAccount()
  const profile = await teacherClient.services.session()
  assert.equal(profile.teacherProfileId, teacher.id)
  assert.equal(profile.name, teacher.name)
  assert.equal((await teacherClient.services.courses())[0].id, course.id)
})

test('unverified teacher can access assigned course feedback and Q&A; assignments and notifications survive linking and removal', async () => {
  const admin = client('admin', 'admin@example.com')
  const first = await admin.saveTeacherProfile(teacherInput())
  const second = await admin.saveTeacherProfile({ ...teacherInput('teacher2@cuet.ac.bd'), name: 'Second Teacher' })
  const course = await admin.services.createCourse({ ...courseInput(first), teacherIds: [first.id, second.id], teacherNames: [first.name, second.name] })
  const unrelated = await admin.services.createCourse(courseInput(second))
  await seed({ 'users/student': account('student', 'student', 'u1@student.cuet.ac.bd'), 'users/teacher': account('teacher'), 'users/second': account('second', 'teacher', 'teacher2@cuet.ac.bd') })
  const student = client('student', 'u1@student.cuet.ac.bd')
  await student.services.addReview({ courseId: course.id, text: 'Useful explanations.', ratings, anonymous: true })
  await student.services.addCourseQuestion({ courseId: course.id, category: 'Exam', text: 'Which chapters are included?', anonymous: true })
  const teacherClient = client('teacher', 'teacher1@cuet.ac.bd', false)
  const linked = await teacherClient.linkTeacherAccount(account('teacher'))
  const [review] = await teacherClient.services.reviews(course.id)
  const [question] = await teacherClient.services.teacherQuestions('teacher')
  assert.equal(question.courseId, course.id)
  assert.equal((await teacherClient.services.teacherNotifications('teacher'))[0].courseId, course.id)
  await teacherClient.services.addTeacherResponse(review.id, 'Thank you for the feedback.')
  await teacherClient.services.addQuestionAnswer(question.id, linked, 'Chapters one and two.')
  assert.equal((await student.services.reviews(course.id))[0].responses.length, 1)
  assert.equal((await student.services.courseQuestions(course.id))[0].answers.length, 1)
  const studentNotices = await student.services.questionNotifications('student')
  assert.equal(studentNotices.length, 1)
  assert.equal(studentNotices[0].read, false)
  assert.match(studentNotices[0].body, /Chapters one and two/)
  for (const operation of [() => getDoc(doc(teacherClient.db, 'courses', unrelated.id)), () => teacherClient.services.reviews(unrelated.id), () => teacherClient.services.courseQuestions(unrelated.id), () => teacherClient.services.createCourse(courseInput(first)), () => teacherClient.services.updateCourse(course.id, courseInput(first)), () => teacherClient.saveTeacherProfile(teacherInput()), () => updateDoc(doc(teacherClient.db, 'teacherProfiles', first.id), { name: 'Unauthorized edit' })]) await assertFails(operation())
  await admin.services.updateCourse(course.id, { ...courseInput(second), teacherIds: [second.id], teacherNames: [second.name] })
  assert.equal((await teacherClient.services.courses()).length, 0)
  await assertFails(teacherClient.services.reviews(course.id))
  await assertFails(teacherClient.services.addTeacherResponse(review.id, 'No longer assigned'))
  const secondClient = client('second', 'teacher2@cuet.ac.bd')
  await secondClient.linkTeacherAccount(account('second', 'teacher', 'teacher2@cuet.ac.bd'))
  assert.equal((await secondClient.services.courses()).length, 2)
  await admin.services.updateCourse(course.id, { ...courseInput(second), teacherIds: [], teacherNames: [] })
  assert.equal((await student.services.reviews(course.id))[0].id, review.id)
  assert.equal((await student.services.courseQuestions(course.id))[0].id, question.id)
})

test('reporting creates an admin notification without a moderation backend', async () => {
  const admin = client('admin', 'admin@example.com')
  const course = await admin.services.createCourse({ ...courseInput({ id: 'unused', name: 'Unused' }), teacherIds: [], teacherNames: [] })
  await seed({ 'users/student': account('student', 'student', 'u1@student.cuet.ac.bd') })
  const student = client('student', 'u1@student.cuet.ac.bd')
  await student.services.addReview({ courseId: course.id, text: 'Helpful feedback.', ratings, anonymous: true })
  const [review] = await student.services.reviews(course.id)
  const originalBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  process.env.EXPO_PUBLIC_BACKEND_URL = ''
  try {
    await student.services.reportContent('courseReview', review.id, 'Spam', undefined, 'Please review this content.')
  } finally {
    if (originalBackendUrl === undefined) delete process.env.EXPO_PUBLIC_BACKEND_URL
    else process.env.EXPO_PUBLIC_BACKEND_URL = originalBackendUrl
  }
  const reports = await admin.services.adminNotifications()
  assert.equal(reports.length, 1)
  assert.equal(reports[0].title, 'New reported content')
  assert.equal(reports[0].read, false)
  const [report] = await admin.services.allReports()
  assert.equal(report.contentId, review.id)
  assert.equal((await student.services.studentNotifications('student')).length, 0)
  await admin.services.updateReportStatus(report.id, 'resolved', 'kept')
  assert.equal((await admin.services.allReports())[0].action, 'kept')
})

test('email is optional, normalized, unique and can be added before a later login', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput(''))
  await admin.services.createCourse(courseInput(teacher))
  await seed({ 'users/teacher': account('teacher') })
  const teacherClient = client('teacher')
  assert.equal((await teacherClient.linkTeacherAccount(account('teacher'))).teacherProfileId, undefined)
  // Reopening Members after signup must not import a duplicate email profile.
  assert.equal((await admin.adminTeacherProfiles()).length, 1)
  await admin.saveTeacherProfile(teacherInput(' Teacher1@CUET.AC.BD '), teacher.id)
  await assert.rejects(admin.saveTeacherProfile(teacherInput()), /already uses this email/)
  assert.equal((await teacherClient.linkTeacherAccount(account('teacher'))).teacherProfileId, teacher.id)
  await assert.rejects(admin.saveTeacherProfile(teacherInput('teacher2@cuet.ac.bd'), teacher.id), /linked teacher/)
  await assertFails(getDocs(collection(teacherClient.db, 'teacherProfileEmails')))
})

test('students can submit a course review and senior advice without a course instance or backend', async () => {
  const studentEmail = 'u2204061@student.cuet.ac.bd'
  const teacher = { ...account('teacher-1', 'teacher'), teacherProfileId: 'teacher-1' }
  await seed({
    'users/student': {
      id: 'student', name: 'Student', email: studentEmail, role: 'student',
      department: 'CSE', batch: '2022', studentId: '2204061',
      currentLevel: '1', currentTerm: '1', darkMode: false,
      active: true, emailVerified: true, updatedAt: Date.now(),
    },
    'courses/course-1': {
      code: 'CSE 101', title: 'Introductory Course', credits: 3,
      department: 'CSE', batch: '2021', level: '1', term: '1',
      courseType: 'Theory', teacherIds: ['teacher-1'], teacherNames: ['Teacher'],
      tags: [], status: 'active',
    },
    'users/teacher-1': teacher,
    'teacherDirectory/teacher-1': {
      name: 'Teacher', department: 'CSE', active: true,
    },
  })
  const student = client('student', studentEmail)
  await student.services.addReview({
    courseId: 'course-1',
    text: 'Helpful course with clear material.',
    ratings,
    anonymous: true,
  })
  const savedReviews = await getDocs(query(collection(student.db, 'courseReviews'), where('courseId', '==', 'course-1')))
  assert.equal(savedReviews.size, 1)
  await student.services.updateReview(savedReviews.docs[0].id, {
    courseId: 'course-1',
    text: 'Updated: helpful course with clear material.',
    ratings,
    anonymous: true,
  })
  assert.equal((await student.services.reviews('course-1'))[0].text, 'Updated: helpful course with clear material.')

  await student.services.addCourseGuide({
    courseId: 'course-1',
    category: 'Preparation Tips',
    title: 'How to prepare',
    text: 'Review the lecture notes each week.',
    resources: '',
    anonymous: false,
  })
  const savedGuides = await getDocs(query(collection(student.db, 'courseGuides'), where('courseId', '==', 'course-1')))
  assert.equal(savedGuides.size, 1)
  assert.equal(savedGuides.docs[0].data().category, 'Preparation Tips')
  assert.equal(savedGuides.docs[0].data().anonymous, false)
  assert.equal(savedGuides.docs[0].data().displayName, 'Student')
  const savedGuideMirror = await getDocs(collection(student.db, 'users', 'student', 'guides'))
  assert.equal(savedGuideMirror.docs[0].data().displayName, 'Student')
  assert.equal((await student.services.courseGuides('course-1'))[0].title, 'How to prepare')

  await student.services.addProfessorReview({
    professorId: 'teacher-1',
    text: 'Clear explanations and helpful feedback.',
    rating: 5,
    aspects: {
      'Teaching Quality': 5,
      Communication: 4,
      Availability: 5,
    },
    tags: ['Clear explanation', 'Supportive'],
    anonymous: true,
  })
  const savedProfessorReviews = await getDocs(query(collection(student.db, 'professorReviews'), where('professorId', '==', 'teacher-1')))
  assert.equal(savedProfessorReviews.size, 1)
  assert.deepEqual(savedProfessorReviews.docs[0].data().aspects, {
    'Teaching Quality': 5,
    Communication: 4,
    Availability: 5,
  })
  assert.deepEqual(savedProfessorReviews.docs[0].data().tags, ['Clear explanation', 'Supportive'])
  const [privateProfessorReview] = await student.services.myProfessorReviews('student')
  assert.deepEqual(privateProfessorReview.aspects, savedProfessorReviews.docs[0].data().aspects)
  assert.deepEqual(privateProfessorReview.tags, savedProfessorReviews.docs[0].data().tags)

  await student.services.addCourseQuestion({
    courseId: 'course-1',
    category: 'Course Content',
    text: 'Question title\n\nHow should I approach this topic?',
    anonymous: true,
  })
  await student.services.addCourseQuestion({
    courseId: 'course-1',
    category: 'Academic',
    text: 'How do I plan my academic term?',
    anonymous: false,
  })
  await student.services.addCourseQuestion({
    courseId: 'course-1',
    category: 'Advising',
    text: 'Where can I get advising support?',
    anonymous: true,
  })
  const savedQuestions = await getDocs(query(collection(student.db, 'courseQuestions'), where('courseId', '==', 'course-1')))
  assert.equal(savedQuestions.size, 3)
  assert.deepEqual(
    savedQuestions.docs.map(question => question.data().category).sort(),
    ['Academic', 'Advising', 'Course Content'],
  )
  const namedQuestion = savedQuestions.docs.find(question => question.data().category === 'Academic')
  assert.equal(namedQuestion.data().anonymous, false)
  assert.equal(namedQuestion.data().displayName, 'Student')
  const privateQuestions = await getDocs(collection(student.db, 'users', 'student', 'questions'))
  assert.equal(privateQuestions.docs.find(question => question.data().category === 'Academic').data().displayName, 'Student')
  assert.equal(
    savedQuestions.docs.find(question => question.data().category === 'Course Content').data().text,
    'Question title\n\nHow should I approach this topic?',
  )
})

test('legacy migration retains IDs and reviews, stays idempotent, and preserves profile editing', async () => {
  const legacy = { ...account('legacy'), bio: 'Original biography', photoUrl: 'https://example.com/photo.png' }
  await seed({ 'users/legacy': legacy, 'teacherDirectory/legacy': { name: legacy.name, department: 'CSE', designation: 'Lecturer', bio: legacy.bio, photoUrl: legacy.photoUrl, active: true, updatedAt: Date.now() }, 'courses/legacy-course': { ...courseInput(legacy) }, 'professorReviews/legacy-review': { professorId: 'legacy', text: 'Helpful teacher', rating: 5, anonymous: true, displayName: null, createdAt: Date.now() } })
  const admin = client('admin', 'admin@example.com')
  const [teacher] = await admin.adminTeacherProfiles()
  assert.equal(teacher.id, 'legacy')
  assert.equal(teacher.linkedUserId, 'legacy')
  await admin.saveTeacherProfile({ ...teacherInput(), name: 'Admin edited' }, teacher.id)
  const [again] = await admin.adminTeacherProfiles()
  assert.equal(again.name, 'Admin edited')
  assert.equal((await getDoc(doc(admin.db, 'teacherDirectory', 'legacy'))).data().bio, legacy.bio)
  const teacherClient = client('legacy')
  const profile = await teacherClient.services.session()
  assert.equal((await teacherClient.services.courses())[0].id, 'legacy-course')
  assert.equal((await teacherClient.services.teachingProfileReviews(profile))[0].id, 'legacy-review')
  await teacherClient.services.addProfessorResponse('legacy-review', 'Thank you.')
  await teacherClient.services.updateProfile({ ...profile, name: 'Personal name', bio: 'Updated biography' })
  const directory = (await getDoc(doc(admin.db, 'teacherDirectory', 'legacy'))).data()
  assert.equal(directory.name, 'Admin edited')
  assert.equal(directory.bio, 'Updated biography')
  await assertFails(updateDoc(doc(teacherClient.db, 'teacherDirectory', 'legacy'), { name: 'Unauthorized official name', updatedAt: Date.now() }))
})
