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
const account = (id, role = 'teacher', email = 'u1@teacher.cuet.ac.bd') => ({ id, name: id, email, role, department: 'CSE', designation: 'Lecturer', darkMode: false, active: true, emailVerified: true })
const teacherInput = (email = 'u1@teacher.cuet.ac.bd') => ({ name: 'Admin Teacher Name', department: 'CSE', designation: 'Professor', email })
const courseInput = teacher => ({ code: 'CSE 101', title: 'Course', credits: 3, department: 'CSE', level: '1', term: '1', courseType: 'Theory', teacherIds: [teacher.id], teacherNames: [teacher.name], tags: [], status: 'active' })
const ratings = { teachingQuality: 5, workload: 3, gradingFairness: 4, courseStructure: 5, availability: 4, difficulty: 3, learningValue: 5 }

// Load the production TypeScript services with only their Firebase connection
// replaced. All reads, transactions and writes still run against real rules.
function client(id, email = 'u1@teacher.cuet.ac.bd', verified = true) {
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
      if (specifier === './firebase') return firebase
      if (specifier.startsWith('.') && !specifier.endsWith('.json')) return load(path.resolve(path.dirname(file), specifier + '.ts'))
      return Module.createRequire(file)(specifier)
    }
    instance._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
    return instance.exports
  }
  return { db, ...load('lib/teacher-profiles.ts'), services: load('lib/services.ts').services }
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

test('admin creates and assigns a profile before login; verified login reveals all assigned courses', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput())
  assert.equal(teacher.linkedUserId, null)
  assert.equal((await getDocs(collection(admin.db, 'users'))).size, 1)
  const first = await admin.services.createCourse(courseInput(teacher))
  const second = await admin.services.createCourse({ ...courseInput(teacher), code: 'CSE 102' })
  await seed({ 'users/teacher': account('teacher') })
  const teacherClient = client('teacher')
  const linked = await teacherClient.linkTeacherAccount(account('teacher'))
  assert.equal(linked.teacherProfileId, teacher.id)
  assert.equal((await getDoc(doc(admin.db, 'teacherProfiles', teacher.id))).data().linkedUserId, 'teacher')
  assert.deepEqual((await teacherClient.services.courses()).map(course => course.id).sort(), [first.id, second.id].sort())
  assert.equal((await teacherClient.linkTeacherAccount(linked)).teacherProfileId, teacher.id)
  await admin.saveTeacherProfile({ ...teacherInput(), name: 'Updated Official Name' }, teacher.id)
  assert.equal((await teacherClient.services.courses())[0].teacherNames[0], 'Updated Official Name')
})

test('unverified, wrong-email and student accounts cannot claim profiles or forge links', async () => {
  const admin = client('admin', 'admin@example.com')
  const teacher = await admin.saveTeacherProfile(teacherInput())
  await seed({ 'users/pending': account('pending'), 'users/stranger': account('stranger', 'teacher', 'u2@teacher.cuet.ac.bd'), 'users/student': account('student', 'student', 'u1@student.cuet.ac.bd') })
  const pending = client('pending', 'u1@teacher.cuet.ac.bd', false)
  assert.equal((await pending.linkTeacherAccount(account('pending'))).teacherLinkPending, true)
  for (const [id, email, verified] of [['pending', 'u1@teacher.cuet.ac.bd', false], ['stranger', 'u2@teacher.cuet.ac.bd', true], ['student', 'u1@student.cuet.ac.bd', true]]) {
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

test('many-to-many assignments, course feedback, Q&A and pre-login notifications survive linking and removal', async () => {
  const admin = client('admin', 'admin@example.com')
  const first = await admin.saveTeacherProfile(teacherInput())
  const second = await admin.saveTeacherProfile({ ...teacherInput('u2@teacher.cuet.ac.bd'), name: 'Second Teacher' })
  const course = await admin.services.createCourse({ ...courseInput(first), teacherIds: [first.id, second.id], teacherNames: [first.name, second.name] })
  const unrelated = await admin.services.createCourse(courseInput(second))
  await seed({ 'users/student': account('student', 'student', 'u1@student.cuet.ac.bd'), 'users/teacher': account('teacher'), 'users/second': account('second', 'teacher', 'u2@teacher.cuet.ac.bd') })
  const student = client('student', 'u1@student.cuet.ac.bd')
  await student.services.addReview({ courseId: course.id, text: 'Useful explanations.', ratings, anonymous: true })
  await student.services.addCourseQuestion({ courseId: course.id, category: 'Exam', text: 'Which chapters are included?', anonymous: true })
  const teacherClient = client('teacher')
  const linked = await teacherClient.linkTeacherAccount(account('teacher'))
  const [review] = await teacherClient.services.reviews(course.id)
  const [question] = await teacherClient.services.teacherQuestions('teacher')
  assert.equal(question.courseId, course.id)
  assert.equal((await teacherClient.services.teacherNotifications('teacher'))[0].courseId, course.id)
  await teacherClient.services.addTeacherResponse(review.id, 'Thank you for the feedback.')
  await teacherClient.services.addQuestionAnswer(question.id, linked, 'Chapters one and two.')
  assert.equal((await student.services.reviews(course.id))[0].responses.length, 1)
  assert.equal((await student.services.courseQuestions(course.id))[0].answers.length, 1)
  for (const operation of [() => getDoc(doc(teacherClient.db, 'courses', unrelated.id)), () => teacherClient.services.reviews(unrelated.id), () => teacherClient.services.courseQuestions(unrelated.id), () => teacherClient.services.createCourse(courseInput(first)), () => teacherClient.services.updateCourse(course.id, courseInput(first)), () => teacherClient.saveTeacherProfile(teacherInput()), () => updateDoc(doc(teacherClient.db, 'teacherProfiles', first.id), { name: 'Unauthorized edit' })]) await assertFails(operation())
  await admin.services.updateCourse(course.id, { ...courseInput(second), teacherIds: [second.id], teacherNames: [second.name] })
  assert.equal((await teacherClient.services.courses()).length, 0)
  await assertFails(teacherClient.services.reviews(course.id))
  await assertFails(teacherClient.services.addTeacherResponse(review.id, 'No longer assigned'))
  const secondClient = client('second', 'u2@teacher.cuet.ac.bd')
  await secondClient.linkTeacherAccount(account('second', 'teacher', 'u2@teacher.cuet.ac.bd'))
  assert.equal((await secondClient.services.courses()).length, 2)
  await admin.services.updateCourse(course.id, { ...courseInput(second), teacherIds: [], teacherNames: [] })
  assert.equal((await student.services.reviews(course.id))[0].id, review.id)
  assert.equal((await student.services.courseQuestions(course.id))[0].id, question.id)
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
  await admin.saveTeacherProfile(teacherInput(' U1@TEACHER.CUET.AC.BD '), teacher.id)
  await assert.rejects(admin.saveTeacherProfile(teacherInput()), /already uses this email/)
  assert.equal((await teacherClient.linkTeacherAccount(account('teacher'))).teacherProfileId, teacher.id)
  await assert.rejects(admin.saveTeacherProfile(teacherInput('u2@teacher.cuet.ac.bd'), teacher.id), /linked teacher/)
  await assertFails(getDocs(collection(teacherClient.db, 'teacherProfileEmails')))
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
