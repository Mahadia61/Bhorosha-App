export interface AiGenerationRequest {
  prompt: string
  responseSchema?: Record<string, unknown>
}

export interface AiGenerationResult {
  text: string
  model: string
  createdAt: number
}

export interface AiClient {
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>
  testConnection(): Promise<{ connected: boolean; model: string }>
}

const geminiModel = () => process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'

export class GeminiClient implements AiClient {
  private readonly apiKey = process.env.GEMINI_API_KEY
  private readonly model = geminiModel()

  private endpoint() {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY is not configured on the backend.')
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`
  }

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const response = await fetch(this.endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500,
          ...(request.responseSchema ? { responseMimeType: 'application/json', responseSchema: request.responseSchema } : {}),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) throw new Error('Gemini is temporarily unavailable.')
    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const text = result.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('').trim()
    if (!text) throw new Error('Gemini returned an empty response.')
    return { text, model: this.model, createdAt: Date.now() }
  }

  async testConnection() {
    await this.generate({ prompt: 'Reply with exactly: GEMINI_CONNECTION_OK' })
    return { connected: true, model: this.model }
  }
}

export function createAiClient(): AiClient {
  return new GeminiClient()
}

export function parseJsonResponse<T>(text: string): T {
  const json = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(json) as T
}
