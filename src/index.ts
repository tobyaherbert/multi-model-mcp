import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { version } from '../package.json'
import { renderMarkdownTable } from './helpers.js'
import { Client } from './client.js'
import { ConversationCache } from './conversation_cache.js'
import { startChat, continueChat } from './chat.js'

const apiBaseURL = process.env.API_BASE_URL
const apiKey = process.env.API_KEY

if (!apiBaseURL) {
  console.error('API_BASE_URL environment variable is required.')
  process.exit(1)
}

if (!apiKey) {
  console.error('API_KEY environment variable is required.')
  process.exit(1)
}

const client = new Client(apiBaseURL, apiKey)
const cache = process.env.CONVERSATION_CACHE_PATH
  ? new ConversationCache(process.env.CONVERSATION_CACHE_PATH)
  : undefined

const server = new McpServer({
  name: 'multi-model-mcp',
  version
})

server.registerTool(
  'list_models',
  {
    description: 'List available models from the OpenAI-compatible API',
    annotations: { readOnlyHint: true }
  },
  async () => {
    try {
      const models = await client.getModels()
      return { content: [{ type: 'text' as const, text: models.join('\n') }] }
    } catch (error) {
      return {
        content: [{ type: 'text' as const, text: String(error) }],
        isError: true
      }
    }
  }
)

if (cache) {
  server.registerTool(
    'list_conversations',
    {
      description: 'List cached conversations',
      annotations: { readOnlyHint: true }
    },
    async () => {
      const conversations = cache.listConversations()

      if (conversations.length < 1) {
        return { content: [{ type: 'text' as const, text: 'No cached conversations.' }] }
      }

      const headers = ['ID', 'Model', 'Messages', 'Created']
      const rows = conversations.map((conversation) => [
        conversation.id,
        conversation.model,
        conversation.message_count.toString(),
        conversation.created_at
      ])

      return {
        content: [{ type: 'text' as const, text: renderMarkdownTable(headers, rows) }]
      }
    }
  )

  server.registerTool(
    'get_conversation_messages',
    {
      description: 'Get the messages from a cached conversation',
      inputSchema: { conversationId: z.string() },
      annotations: { readOnlyHint: true }
    },
    async ({ conversationId }) => {
      const messages = cache.getMessages(conversationId)

      if (messages.length < 1) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Conversation ${conversationId} has no messages.` }]
        }
      }

      const headers = ['Role', 'Content']
      const rows = messages.map((message) => [message.role, message.content])

      return {
        content: [{ type: 'text' as const, text: renderMarkdownTable(headers, rows) }]
      }
    }
  )

  server.registerTool(
    'start_chat',
    {
      description: 'Start a new conversation with an LLM via an OpenAI-compatible API',
      inputSchema: {
        model: z.string().describe('The model to use for this conversation'),
        prompt: z.string().describe('The message to send to the model')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ model, prompt }) => startChat(client, cache, model, prompt)
  )

  server.registerTool(
    'continue_chat',
    {
      description: 'Continue an existing conversation with an LLM',
      inputSchema: {
        conversationId: z.string().describe('The ID of the conversation to continue'),
        prompt: z.string().describe('The message to send to the model')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ conversationId, prompt }) => continueChat(client, cache, conversationId, prompt)
  )
} else {
  server.registerTool(
    'chat',
    {
      description: 'Send a message to an LLM via an OpenAI-compatible API',
      inputSchema: {
        model: z.string().describe('The model to use for this conversation'),
        prompt: z.string().describe('The message to send to the model')
      },
      annotations: { readOnlyHint: true }
    },
    async ({ model, prompt }) => startChat(client, undefined, model, prompt)
  )
}

const transport = new StdioServerTransport()
await server.connect(transport)
