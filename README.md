# multi-model-mcp

An MCP server that provides access to other LLMs via an OpenAI-compatible API.

## Setup

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `API_BASE_URL` | Yes | Base URL of the OpenAI-compatible API (e.g. `https://api.openai.com/v1`) |
| `API_KEY` | Yes | Bearer token for authentication |
| `CONVERSATION_CACHE_PATH` | No | Path to a SQLite database for persisting conversations |

### Usage with Claude Desktop

Add the following to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "multi-model-mcp": {
      "command": "npx",
      "args": ["-y", "multi-model-mcp"],
      "env": {
        "API_BASE_URL": "https://api.openai.com/v1",
        "API_KEY": "your-api-key",
        "CONVERSATION_CACHE_PATH": "/path/to/conversations.db"
      }
    }
  }
}
```

## Tools

### `list_models`

Lists available models from the API.

### `chat` / `start_chat` + `continue_chat`

When `CONVERSATION_CACHE_PATH` is **not set**, a single `chat` tool is available for stateless one-off prompts.

When `CONVERSATION_CACHE_PATH` **is set**, two tools are available instead:

- **`start_chat`** — Begins a new conversation with a model and returns a conversation ID.
- **`continue_chat`** — Sends a follow-up message using an existing conversation ID. The full message history is sent to the model automatically.

### `list_conversations`

Lists all cached conversations with their model, message count, and creation date. Only available when caching is enabled.

### `get_conversation_messages`

Retrieves the full message history of a cached conversation. Only available when caching is enabled.

## Development

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```

Produces a single bundled file at `dist/multi-model-mcp.js`.
