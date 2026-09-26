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

export type ReviewSummary = {
  id: string
  summary: string
  positivePoints: string[]
  negativePoints: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  fallback: boolean
}

export type ModerationResult = { decision: 'safe' | 'flagged'; reason: string; confidence: number; fallback: boolean }
export type AcademicAssistantResponse = { conversationId: string; answer: string; fallback: boolean }

export function loadReviewSummary(subjectType: 'course' | 'teacher', subjectId: string) {
  return request<ReviewSummary>('/v1/ai/review-summary', { method: 'POST', body: JSON.stringify({ subjectType, subjectId }) })
}

export function moderateContent(entityType: 'review' | 'question' | 'advice', entityId: string, content: string) {
  return request<ModerationResult>('/v1/ai/moderate', { method: 'POST', body: JSON.stringify({ entityType, entityId, content }) })
}

export function askAcademicAssistant(question: string, conversationId?: string) {
  return request<AcademicAssistantResponse>('/v1/ai/academic-assistant', { method: 'POST', body: JSON.stringify({ question, ...(conversationId ? { conversationId } : {}) }) })
}

export function testGeminiConnection() {
  return request<{ connected: boolean; model: string }>('/v1/ai/health')
}
