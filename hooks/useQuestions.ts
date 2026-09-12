import { useCallback, useState } from 'react'
import type { CourseQuestion } from '@/lib/types/types'
import { questionService } from '@/services/questionService'
export function useQuestions() {
  const [questions, setQuestions] = useState<CourseQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const loadForCourse = useCallback(async (courseId: string) => { setLoading(true); try { const next = await questionService.courseQuestions(courseId); setQuestions(next); return next } finally { setLoading(false) } }, [])
  return { questions, loading, loadForCourse }
}
