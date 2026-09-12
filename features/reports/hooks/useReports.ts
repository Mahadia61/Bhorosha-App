import { useCallback, useEffect, useState } from 'react'
import type { Report } from '@/lib/types/types'
import { reportService } from '../services/reportService'

export function useReports({ includeResolved = false } = {}) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReports(await (includeResolved ? reportService.allReports() : reportService.reports()))
    } catch (reason) {
      const next = reason instanceof Error ? reason : new Error('Unable to load reports.')
      setError(next)
      throw next
    } finally {
      setLoading(false)
    }
  }, [includeResolved])
  useEffect(() => { void reload() }, [reload])
  return { reports, loading, error, reload }
}
