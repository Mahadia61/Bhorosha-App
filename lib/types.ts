export type Role = 'student' | 'teacher'
export type RatingMap = { teachingQuality: number; workload: number; gradingFairness: number; courseStructure: number; availability: number }
export type Profile = { id: string; name: string; email: string; role: Role; department: string; darkMode?: boolean }
export type Course = { id: string; code: string; title: string; credits: number; semester: string; department: string; teacherId: string; teacherName: string; tags: string[] }
export type Review = { id: string; courseId: string; authorId: string; text: string; ratings: RatingMap; anonymous: boolean; createdAt: number }
export type Professor = { id: string; name: string; department: string; bio?: string }
export type ProfessorReview = { id: string; professorId: string; authorId: string; text: string; rating: number; anonymous: boolean; createdAt: number }
