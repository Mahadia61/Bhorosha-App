import type { Course, Professor } from './types'
export const mockProfessors: Professor[] = [
  { id: 'teacher-rahman', name: 'Dr. A. Rahman', department: 'CSE', bio: 'Associate Professor, Computer Science & Engineering.' },
  { id: 'teacher-islam', name: 'Dr. S. Islam', department: 'CSE', bio: 'Assistant Professor, Computer Science & Engineering.' },
]
export const mockCourses: Course[] = [
  { id: 'cse-301', code: 'CSE 301', title: 'Database Management Systems', credits: 3, semester: 'Level 3, Term 1', department: 'CSE', teacherId: 'teacher-rahman', teacherName: 'Dr. A. Rahman', tags: ['database', 'sql'] },
  { id: 'cse-303', code: 'CSE 303', title: 'Operating Systems', credits: 3, semester: 'Level 3, Term 1', department: 'CSE', teacherId: 'teacher-islam', teacherName: 'Dr. S. Islam', tags: ['systems'] },
  { id: 'cse-401', code: 'CSE 401', title: 'Software Engineering', credits: 3, semester: 'Level 4, Term 1', department: 'CSE', teacherId: 'teacher-rahman', teacherName: 'Dr. A. Rahman', tags: ['design', 'project'] },
]
