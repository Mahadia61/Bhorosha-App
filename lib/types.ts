export type Role = 'student' | 'teacher' | 'admin'
export type AcademicLevel = '1' | '2' | '3' | '4'
export type AcademicTerm = '1' | '2'
export type CourseType = 'Theory' | 'Lab' | 'Project' | 'Sessional' | 'Other'
export type CourseStatus = 'active' | 'archived' | 'draft'
export type QuestionCategory = 'Course Content' | 'Exam' | 'Assignment' | 'Project' | 'Registration' | 'Other'

export type RatingMap = {
  teachingQuality: number
  workload: number
  gradingFairness: number
  courseStructure: number
  availability: number
  difficulty: number
  learningValue: number
}

export type Profile = {
  id: string
  teacherProfileId?: string
  teacherLinkPending?: boolean
  name: string
  email: string
  role: Role
  department: string
  designation?: string
  bio?: string
  photoUrl?: string
  darkMode?: boolean
  active?: boolean
  emailVerified?: boolean
  batch?: string
  studentId?: string
  currentLevel?: AcademicLevel
  currentTerm?: AcademicTerm
  warningCount?: number
  createdAt?: number
}

// Independent of users/{uid}; legacy teachers retain their existing UID as the
// profile ID so existing course assignments and professor reviews stay valid.
export type TeacherProfile = {
  id: string
  name: string
  department: string
  designation: string
  email: string
  linkedUserId: string | null
}

export type Course = {
  id: string
  code: string
  title: string
  credits: number
  department: string
  level: AcademicLevel | null
  term: AcademicTerm | null
  courseType: CourseType | null
  teacherIds: string[]
  teacherNames: string[]
  tags: string[]
  status?: CourseStatus
}

export type TeacherResponse = { id: string; teacherName: string; text: string; createdAt: number }

// Public community records never contain a Firebase UID, email, student ID, or batch.
export type Review = {
  id: string
  courseId: string
  text: string
  ratings: RatingMap
  anonymous: boolean
  displayName: string | null
  createdAt: number
  updatedAt?: number
  responses?: TeacherResponse[]
}

export type Professor = { id: string; name: string; department: string; designation?: string; bio?: string; photoUrl?: string }

export type ProfessorReview = { id: string; professorId: string; text: string; rating: number; anonymous: boolean; displayName: string | null; createdAt: number; responses?: TeacherResponse[] }

export type QuestionAnswer = { id: string; authorName: string; authorRole: 'student' | 'teacher'; text: string; createdAt: number }

export type CourseQuestion = { id: string; courseId: string; category: QuestionCategory; text: string; anonymous: boolean; createdAt: number; answers?: QuestionAnswer[] }

export type CourseGuide = { id: string; courseId: string; title: string; text: string; resources?: string; createdAt: number }
export type ContentType = 'courseReview' | 'professorReview' | 'courseQuestion' | 'answer'
export type ReportReason = 'Offensive language' | 'Personal attack' | 'Fake information' | 'Spam' | 'Other'
export type Report = { id: string; contentType: ContentType; contentId: string; questionId?: string; reason: ReportReason; status: 'pending' | 'kept' | 'hidden' | 'removed' | 'warned'; createdAt: number }
export type AppNotificationCategory = 'reports' | 'users' | 'courses' | 'system'
export type AppNotification = { id: string; questionId?: string; courseId?: string; reportId?: string; title: string; body: string; read: boolean; createdAt: number; category?: AppNotificationCategory }
export type ModerationAppeal = { id: string; reportId: string; submittedBy: string; reason: string; status: 'pending' | 'accepted' | 'rejected'; createdAt: number }
export type ModerationHistoryItem = { id: string; action: 'kept' | 'hidden' | 'removed' | 'warned' | 'archived' | 'activated' | 'suspended'; targetType: string; targetId: string; summary: string; createdAt: number }

export type ActivityItem = {
  id: string
  kind: 'courseReview' | 'professorReview' | 'question' | 'answer'
  targetId: string
  courseId?: string
  professorId?: string
  questionId?: string
  text: string
  createdAt: number
}
