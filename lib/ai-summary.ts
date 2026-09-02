import type { Review } from './types'

type SummaryResponse = { summary: string; source?: 'ai' | 'local' }

/**
 * Uses a server-side AI endpoint when configured. The mobile app never stores
 * an AI provider secret. In development, it returns a transparent local summary.
 */
export async function summarizeReviews(subject: string, reviews: Pick<Review, 'text' | 'ratings'>[]): Promise<SummaryResponse> {
  if (!reviews.length) return { summary: 'There are not enough reviews to summarize yet.', source: 'local' }
  const endpoint = process.env.EXPO_PUBLIC_AI_SUMMARY_ENDPOINT
  if (endpoint) {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, reviews }) })
    if (!response.ok) throw new Error('The AI summary service is temporarily unavailable.')
    const data = await response.json() as { summary?: string }
    if (!data.summary) throw new Error('The AI summary service returned no summary.')
    return { summary: data.summary, source: 'ai' }
  }
  const average = reviews.reduce((sum, review) => sum + Object.values(review.ratings).reduce((total, value) => total + value, 0) / 5, 0) / reviews.length
  const snippets = reviews.map(review => review.text.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3)
  return { summary: `${reviews.length} review${reviews.length === 1 ? '' : 's'} give ${subject} an average rating of ${average.toFixed(1)}/5. Common feedback: ${snippets.join(' · ')}`, source: 'local' }
}
