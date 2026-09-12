import { useCallback, useEffect, useState } from 'react'
import type { Course } from '@/lib/types/types'
import { courseService } from '@/services/courseService'
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const reload = useCallback(async () => { setLoading(true); setError(null); try { setCourses(await courseService.courses()) } catch (reason) { const next = reason instanceof Error ? reason : new Error('Unable to load courses.'); setError(next); throw next } finally { setLoading(false) } }, [])
  useEffect(() => { void reload() }, [reload])
  return { courses, loading, error, reload }
}
