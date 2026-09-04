export type Role = 'student' | 'teacher' | 'admin'
export type AcademicLevel = '1' | '2' | '3' | '4'
export type AcademicTerm = '1' | '2'
export type CourseType = 'Theory' | 'Lab' | 'Project' | 'Sessional' | 'Other'
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
export type Report = { id: string; contentType: ContentType; contentId: string; questionId?: string; reason: ReportReason; status: 'pending' | 'kept' | 'removed' | 'warned'; createdAt: number }
export type AppNotification = { id: string; questionId?: string; courseId?: string; title: string; body: string; read: boolean; createdAt: number }

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
