import { auth } from '../firebase/firebase'
import type { ProfessorReview, Review } from '../types/types'

type SummarySubject = { type: 'course'; id: string; label: string } | { type: 'teacher'; id: string; label: string } | { type: 'assignedCourses'; label: string }
type SummaryResponse = { summary: string; source?: 'ai' | 'local' }
type LocalReview = Pick<Review, 'text' | 'ratings'> | Pick<ProfessorReview, 'text' | 'rating'>

const backendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''

function localScore(review: LocalReview) {
  return 'ratings' in review ? Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length : review.rating
}

function localSummary(subject: SummarySubject, reviews: LocalReview[]): SummaryResponse {
  const average = reviews.reduce((sum, review) => sum + localScore(review), 0) / reviews.length
  return { summary: `${reviews.length} review${reviews.length === 1 ? '' : 's'} give ${subject.label} an average rating of ${average.toFixed(1)}/5. This private local aggregate does not send review text to any third party; configure the optional summary backend for AI theme analysis.`, source: 'local' }
}

/**
 * Review text never leaves the app directly. The optional separate backend
 * receives an authenticated subject identifier and reads authorised Firestore
 * records itself. Without that backend, a transparent local aggregate is used.
 */
export async function summarizeReviews(subject: SummarySubject, reviews: LocalReview[]): Promise<SummaryResponse> {
  if (!reviews.length) return { summary: 'There are not enough reviews to summarize yet.', source: 'local' }
  const url = backendUrl()
  if (!url || !auth?.currentUser) return localSummary(subject, reviews)
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${url}/v1/summaries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjectType: subject.type, ...(subject.type === 'assignedCourses' ? {} : { subjectId: subject.id }) }),
  })
  const result = await response.json().catch(() => ({})) as SummaryResponse & { error?: string }
  if (!response.ok || !result.summary) throw new Error(result.error ?? 'The review summary service is temporarily unavailable.')
  return result
}
