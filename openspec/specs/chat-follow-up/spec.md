## ADDED Requirements

### Requirement: Conversation history in search requests
The frontend SHALL include the most recent 5 messages (user + assistant combined) in the request body when sending a query. The POST body for both `/api/search` and `/api/investigate` SHALL change from `{ query }` to `{ query, messages }` where `messages` is `Array<{ role: "user" | "assistant", content: string }>`. The `messages` array SHALL contain only the `content` field (no reasoning, tool calls, or sources).

#### Scenario: First message (no history)
- **WHEN** the user sends their first message in a conversation
- **THEN** the request body is `{ "query": "How does auth work?", "messages": [] }`

#### Scenario: Follow-up with history
- **WHEN** the user sends a third message after two prior exchanges
- **THEN** the request body includes `messages` with the previous 4 messages (2 user + 2 assistant), most recent last

#### Scenario: History limit of 5
- **WHEN** the conversation has 10 messages and the user sends a new query
- **THEN** the request body includes only the most recent 5 messages (not including the new query)

### Requirement: Fast Search multi-turn support
The `fastSearch()` function SHALL accept an optional `history` parameter of type `Array<{ role: "user" | "assistant", content: string }>`. When provided, the function SHALL pass `messages: [...history, { role: "user", content: query }]` to `streamText()` instead of a single user message. The system prompt SHALL remain unchanged.

#### Scenario: Fast Search with history
- **WHEN** `/api/search` receives `{ "query": "What about JWT?", "messages": [{"role":"user","content":"How does auth work?"},{"role":"assistant","content":"Auth uses..."}] }`
- **THEN** `streamText` is called with 3 messages: the 2 history messages plus the new user query

#### Scenario: Fast Search without history
- **WHEN** `/api/search` receives `{ "query": "How does auth work?" }` with no `messages` field
- **THEN** `streamText` is called with a single user message (backward compatible)

### Requirement: Deep Search multi-turn support
The `deepSearch()` function SHALL accept an optional `history` parameter of type `Array<{ role: "user" | "assistant", content: string }>`. When provided, the function SHALL pass `messages: [...history, { role: "user", content: query }]` to `streamText()`. The Agent Loop SHALL continue tool calling in the context of the full conversation history.

#### Scenario: Deep Search follow-up question
- **WHEN** the user asks "Can you show me the actual middleware code?" after a previous Q&A about auth
- **THEN** the Deep Search agent has context from the previous exchange and can reference prior answers

#### Scenario: Deep Search first question
- **WHEN** the user asks a new question with no history
- **THEN** `deepSearch` works identically to the current single-turn behavior

### Requirement: History content sanitization
When constructing the `messages` array from conversation history, the frontend SHALL include ONLY the `content` field from each message. Reasoning text, tool call information, source citations, and ThoughtChain entries SHALL be excluded to minimize token usage.

#### Scenario: Sanitize assistant message
- **WHEN** a previous assistant message has content "Auth uses JWT tokens..." plus reasoning, tool calls, and sources
- **THEN** the history entry contains only `{ "role": "assistant", "content": "Auth uses JWT tokens..." }`
