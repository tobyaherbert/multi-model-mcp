import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

export class ConversationCache {
  private database: DatabaseSync

  // MARK: - Object Lifecycle

  public constructor(path: string) {
    this.database = new DatabaseSync(path)

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    this.database.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
  }

  // MARK: - Conversations

  public listConversations() {
    const statement = this.database.prepare(`
      SELECT
        conversations.id,
        conversations.model,
        conversations.created_at,
        COUNT(messages.id) as message_count
      FROM conversations
      LEFT JOIN messages ON messages.conversation_id = conversations.id
      GROUP BY conversations.id
      ORDER BY conversations.created_at DESC
    `)

    return statement.all() as { id: string; model: string; created_at: string; message_count: number }[]
  }

  public getConversation(id: string) {
    const statement = this.database.prepare(`
      SELECT
        conversations.id,
        conversations.model,
        conversations.created_at,
        COUNT(messages.id) as message_count
      FROM conversations
      LEFT JOIN messages ON messages.conversation_id = conversations.id
      WHERE conversations.id = ?
      GROUP BY conversations.id
    `)

    return statement.get(id) as { id: string; model: string; created_at: string; message_count: number } | undefined
  }

  public createConversation(model: string) {
    const id = crypto.randomUUID()
    const statement = this.database.prepare('INSERT INTO conversations (id, model) VALUES (?, ?)')
    statement.run(id, model)
    return id
  }

  public destroyConversation(id: string) {
    const statement = this.database.prepare('DELETE FROM conversations WHERE id = ?')
    statement.run(id)
  }

  // MARK: - Messages

  public getMessages(conversationId: string) {
    const statement = this.database.prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `)

    return statement.all(conversationId) as { id: string; role: string; content: string; created_at: string }[]
  }

  public addMessage(conversationId: string, role: string, content: string): void {
    const statement = this.database.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
    statement.run(conversationId, role, content)
  }
}
