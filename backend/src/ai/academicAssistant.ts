import { getFirestore } from 'firebase-admin/firestore'
import type { AiClient } from './aiClient.js'

export interface AcademicContext { courses: unknown[]; prerequisites: unknown[]; courseDescriptions: unknown[]; departments: unknown[] }
export interface AcademicAssistantInput { userId: string; conversationId?: string; question: string; context: AcademicContext }
export interface AcademicAssistantResult { conversationId: string; answer: string; model: string; createdAt: number; fallback: boolean }

export class AcademicAssistantService {
  constructor(private readonly aiClient: AiClient) {}

  async answer(input: AcademicAssistantInput): Promise<AcademicAssistantResult> {
    const now = Date.now()
    const conversationId = input.conversationId ?? getFirestore().collection('aiAssistantConversations').doc().id
    const conversationRef = getFirestore().collection('aiAssistantConversations').doc(conversationId)
    const conversation = await conversationRef.get()
    if (conversation.exists && conversation.data()?.userId !== input.userId) throw new Error('This assistant conversation does not belong to the signed-in user.')
    await conversationRef.set({ userId: input.userId, updatedAt: now }, { merge: true })
    try {
      const generated = await this.aiClient.generate({ prompt: `You are Bhorosha's academic assistant. Answer academic guidance questions only using the supplied Bhorosha data. If the question is unrelated to courses, prerequisites, course descriptions, departments, or academic planning, politely refuse. Do not invent course facts. Do not act as a general chatbot.\nQuestion: ${input.question}\nBhorosha data: ${JSON.stringify(input.context)}` })
      const result = { conversationId, answer: generated.text, model: generated.model, createdAt: now, fallback: false }
      await conversationRef.collection('messages').add({ userId: input.userId, question: input.question, answer: result.answer, model: result.model, createdAt: now })
      return result
    } catch (error) {
      console.error('AI academic assistant failed', error)
      const result = { conversationId, answer: 'The academic assistant is temporarily unavailable. Please check the course catalog or try again later.', model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash', createdAt: now, fallback: true }
      await conversationRef.collection('messages').add({ userId: input.userId, question: input.question, answer: result.answer, model: result.model, createdAt: now, fallback: true })
      return result
    }
  }
}
