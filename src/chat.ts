import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { Client } from './client.js'
import type { ConversationCache } from './conversation_cache.js'

export async function startChat(
  client: Client,
  cache: ConversationCache | undefined,
  model: string,
  prompt: string
): Promise<CallToolResult> {
  const conversationId = cache?.createConversation(model)
  const messages = [{ role: 'user', content: prompt }]

  try {
    const text = await client.createChatCompletion(model, messages)

    if (cache && conversationId) {
      cache.addMessage(conversationId, 'user', prompt)
      cache.addMessage(conversationId, 'assistant', text)
    }

    const content: CallToolResult['content'] = [{ type: 'text', text }]

    if (conversationId) {
      content.unshift({ type: 'text', text: `Conversation ID: ${conversationId}` })
    }

    return { content }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: String(error) }]
    }
  }
}

export async function continueChat(
  client: Client,
  cache: ConversationCache,
  conversationId: string,
  prompt: string
): Promise<CallToolResult> {
  const conversation = cache.getConversation(conversationId)

  if (!conversation) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Conversation ${conversationId} not found.` }]
    }
  }

  const messages = cache
    .getMessages(conversationId)
    .map((message) => ({ role: message.role, content: message.content }))

  messages.push({ role: 'user', content: prompt })

  try {
    const text = await client.createChatCompletion(conversation.model, messages)

    cache.addMessage(conversationId, 'user', prompt)
    cache.addMessage(conversationId, 'assistant', text)

    return {
      content: [
        { type: 'text', text: `Conversation ID: ${conversationId}` },
        { type: 'text', text }
      ]
    }
  } catch (error) {
    return {
      isError: true,
      content: [{ type: 'text', text: String(error) }]
    }
  }
}
