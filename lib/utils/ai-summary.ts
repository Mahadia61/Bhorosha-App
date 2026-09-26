import type { ProfessorReview, Review } from '../types/types'
import { loadReviewSummary, type ReviewSummary } from '../services/ai'

type SummarySubject = { type: 'course'; id: string; label: string } | { type: 'teacher'; id: string; label: string } | { type: 'assignedCourses'; label: string }
type LocalReview = Pick<Review, 'text' | 'ratings'> | Pick<ProfessorReview, 'text' | 'rating'>

function localScore(review: LocalReview) {
  return 'ratings' in review ? Object.values(review.ratings).reduce((sum, value) => sum + value, 0) / Object.values(review.ratings).length : review.rating
}

function localSummary(subject: SummarySubject, reviews: LocalReview[]): ReviewSummary {
  const average = reviews.length ? reviews.reduce((sum, review) => sum + localScore(review), 0) / reviews.length : 0
  return { id: `local:${subject.type}:${'id' in subject ? subject.id : 'assigned'}`, summary: reviews.length ? `${reviews.length} review${reviews.length === 1 ? '' : 's'} give ${subject.label} an average rating of ${average.toFixed(1)}/5.` : 'There are not enough reviews to summarize yet.', positivePoints: [], negativePoints: [], sentiment: average >= 4 ? 'positive' : average <= 2 ? 'negative' : 'neutral', fallback: true }
}

export async function summarizeReviews(subject: SummarySubject, reviews: LocalReview[]): Promise<ReviewSummary> {
  if (subject.type === 'assignedCourses') return localSummary(subject, reviews)
  try { return await loadReviewSummary(subject.type, subject.id) } catch { return localSummary(subject, reviews) }
}
