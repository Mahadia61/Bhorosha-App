import { auth } from '../firebase/firebase'

const backendUrl = () => process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = backendUrl()
  if (!url || !auth?.currentUser) throw new Error('AI features require a signed-in account and configured backend.')
  const token = await auth.currentUser.getIdToken()
  const response = await fetch(`${url}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const result = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(result.error ?? 'The AI service is temporarily unavailable.')
  return result
}

export type SentimentResult = { sentiment: string; confidence?: number; source: 'ai' | 'local' }
export type AdminInsights = { insights: string; counts: Record<string, number>; source: 'ai' | 'local' }

export function analyzeReviewSentiment(text: string) {
  return request<SentimentResult>('/v1/ai/sentiment', { method: 'POST', body: JSON.stringify({ text }) })
}

export function loadAdminAiInsights() {
  return request<AdminInsights>('/v1/ai/admin-insights')
}
