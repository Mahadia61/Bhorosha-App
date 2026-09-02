import type { Course, Professor, Profile } from './types'
export const mockProfiles: Profile[] = [
  { id: 'demo-student', name: 'CUET Student', email: 'u123456@student.cuet.ac.bd', role: 'student', department: 'CSE', darkMode: false },
  { id: 'teacher-rahman', name: 'Dr. A. Rahman', email: 'u1001@teacher.cuet.ac.bd', role: 'teacher', department: 'CSE', designation: 'Associate Professor', darkMode: false },
  { id: 'teacher-islam', name: 'Dr. S. Islam', email: 'u1002@teacher.cuet.ac.bd', role: 'teacher', department: 'CSE', designation: 'Assistant Professor', darkMode: false },
  { id: 'admin-local', name: 'Bhorosha Admin', email: 'admin@gmail.com', role: 'admin', department: 'CUET', darkMode: false },
]
export const mockProfessors: Professor[] = [
  { id: 'teacher-rahman', name: 'Dr. A. Rahman', department: 'CSE', designation: 'Associate Professor', bio: 'Associate Professor, Computer Science & Engineering.' },
  { id: 'teacher-islam', name: 'Dr. S. Islam', department: 'CSE', designation: 'Assistant Professor', bio: 'Assistant Professor, Computer Science & Engineering.' },
]
export const mockCourses: Course[] = [
  { id: 'cse-301', code: 'CSE 301', title: 'Database Management Systems', credits: 3, semester: 'Level 3, Term 1', department: 'CSE', teacherIds: ['teacher-rahman'], teacherNames: ['Dr. A. Rahman'], tags: ['database', 'sql'] },
  { id: 'cse-303', code: 'CSE 303', title: 'Operating Systems', credits: 3, semester: 'Level 3, Term 1', department: 'CSE', teacherIds: ['teacher-islam'], teacherNames: ['Dr. S. Islam'], tags: ['systems'] },
  { id: 'cse-401', code: 'CSE 401', title: 'Software Engineering', credits: 3, semester: 'Level 4, Term 1', department: 'CSE', teacherIds: ['teacher-rahman', 'teacher-islam'], teacherNames: ['Dr. A. Rahman', 'Dr. S. Islam'], tags: ['design', 'project'] },
]
