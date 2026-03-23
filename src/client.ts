import { z } from 'zod'

// MARK: - Types and Schemas

const ModelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string() })).optional()
})

export type ModelsResponse = z.infer<typeof ModelsResponseSchema>

export const ChatMessageSchema = z.object({
  role: z.string(),
  content: z.string()
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

const ChatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().optional() }).optional()
      })
    )
    .optional()
})

export type ChatResponse = z.infer<typeof ChatResponseSchema>

// MARK: - API Client

export class Client {
  private baseUrl: string
  private key: string

  // MARK: - Object Lifecycle

  public constructor(baseUrl: string, key: string) {
    this.baseUrl = baseUrl
    this.key = key
  }

  // MARK: - URLs

  public getBaseURL() {
    return this.baseUrl.replace(/\/+$/, '')
  }

  public getURL(path: string) {
    const baseURL = this.getBaseURL()
    const separator = path.startsWith('/') ? '' : '/'
    return `${baseURL}${separator}${path}`
  }

  // MARK: - API Methods

  public async getModels() {
    const response = await fetch(this.getURL('/models'), {
      headers: { Authorization: `Bearer ${this.key}` }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error (${response.status}): ${error}`)
    }

    const data = ModelsResponseSchema.parse(await response.json())
    return (data.data?.map((model) => model.id) ?? []).sort()
  }

  public async createChatCompletion(model: string, messages: ChatMessage[]) {
    const response = await fetch(this.getURL('/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.key}`
      },
      body: JSON.stringify({ model, messages })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error (${response.status}): ${error}`)
    }

    const data = ChatResponseSchema.parse(await response.json())
    return data.choices?.[0]?.message?.content ?? 'No response from model.'
  }
}
