import type { AcademicLevel, AcademicTerm, CourseType, QuestionCategory } from '../types/types'

export const academicLevels: AcademicLevel[] = ['1', '2', '3', '4']
export const academicTerms: AcademicTerm[] = ['1', '2']
export const courseTypes: CourseType[] = ['Theory', 'Lab', 'Project', 'Sessional', 'Other']
export const adminCourseTypes: CourseType[] = ['Theory', 'Sessional', 'Other']
export const questionCategories: QuestionCategory[] = ['Course Content', 'Exam', 'Assignment', 'Project', 'Registration', 'Other']

export function academicLabel(level: AcademicLevel | null | undefined, term: AcademicTerm | null | undefined) {
  return level && term ? `Level ${level}, Term ${term}` : 'Academic term not set'
}
