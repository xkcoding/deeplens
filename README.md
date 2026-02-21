# DeepLens

> AI-powered code archaeologist — autonomously explores your codebase and generates deep architectural documentation.

DeepLens is a desktop + CLI tool that uses Claude Agent to explore code repositories like a senior architect would: identifying business domains, tracing data flows, and producing documentation organized by **concepts**, not file paths.

## How It Works

```
Your Code ──► Agent Explores ──► Knowledge Outline ──► You Review ──► Deep Docs ──► VitePress Site
               (Claude)          (JSON concept map)     (HITL)        (Hub+Spoke)    (local preview)
```

1. **Explore** — Claude Agent reads your code, identifies 3-8 business domains, maps files to concepts
2. **Review** — You review and adjust the outline (rename, reorganize, approve)
3. **Generate** — Agent writes Hub docs (high-level) + Spoke docs (details) with Mermaid diagrams
4. **Browse** — VitePress site with full-text search, Q&A chat, and MCP integration

## What Makes It Different

| | DeepWiki | DeepLens |
|---|---|---|
| Organization | Mirrors file tree | Business concept grouping |
| Depth | Code listing + shallow description | Data flow analysis + architectural intent |
| Diagrams | Basic class diagrams | Sequence diagrams, flowcharts (dynamic behavior) |
| Human input | None | Outline review before generation |
| Noise handling | Shows everything | Smart simplification (business-first) |
| Runtime | Cloud SaaS | Local (desktop app or CLI) |

## Quick Start

### Prerequisites

- Node.js 20+
- Anthropic API key (for code exploration & doc generation)
- OpenRouter API key (for Q&A search & embedding)

### Install

```bash
git clone https://github.com/xkcoding/deeplens.git
cd deeplens
npm install
npm run build
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required: Claude API for exploration & generation
ANTHROPIC_API_KEY=sk-ant-...

# Required for indexing & Q&A
OPENROUTER_API_KEY=sk-or-...
```

### Usage

#### Full Pipeline (recommended)

```bash
# Explore → Review outline → Generate docs → Preview
npx deeplens analyze /path/to/your/project
```

#### Step by Step

```bash
# 1. Explore codebase, output outline JSON
npx deeplens explore /path/to/project

# 2. Generate docs from reviewed outline
npx deeplens generate /path/to/project/.deeplens/outline.json

# 3. Index docs for semantic search
npx deeplens index /path/to/project

# 4. Start preview + Q&A server
npx deeplens serve /path/to/project

# 5. Export static site
npx deeplens export /path/to/project
```

#### MCP Server (for IDE Agents)

```bash
# Start MCP server for Cursor / Windsurf integration
npx deeplens mcp-server --project /path/to/project
```

### Desktop App

DeepLens also ships as a Tauri desktop app with a visual UI:

```bash
# Development
npm run dev:tauri

# Build
npm run build:tauri
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `analyze <path>` | Full pipeline: explore → review → generate → preview |
| `explore <path>` | Run exploration agent, output outline JSON |
| `generate <outline>` | Generate documentation from outline |
| `preview [docs-path]` | Start VitePress dev server |
| `index <path>` | Index documentation for semantic search |
| `serve [path]` | Start API server + VitePress preview |
| `export [path]` | Build static HTML site |
| `mcp-server` | Start MCP server (stdio) for IDE integration |
| `sidecar` | Start sidecar HTTP server (used by desktop app) |

## Architecture

```
┌──────────────── Desktop App (Tauri) ────────────────┐
│                                                      │
│  Tauri Shell (Rust)  ◄──►  React Frontend            │
│                                                      │
│         ▼ Sidecar                                    │
│  ┌────────────────────────────────────┐              │
│  │  Node.js API (Hono)               │              │
│  │                                    │  Anthropic   │
│  │  claude-agent-sdk ─────────────────────► API      │
│  │  (explore + generate)             │  (Claude)     │
│  │                                    │              │
│  │  Vercel AI SDK ────────────────────────► OpenRouter│
│  │  (Fast Search + Deep Search)      │  (Embed+LLM) │
│  │                                    │              │
│  │  MCP Server ◄─── Cursor/Windsurf  │              │
│  └─────────────┬──────────────────────┘              │
│                │                                     │
│  SQLite + sqlite-vec    VitePress (preview)          │
└──────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Tauri (Rust) |
| Frontend | React + Tailwind CSS |
| API Server | Hono (Node.js) |
| Exploration & Generation | Claude Agent SDK + Anthropic API |
| Q&A Search | Vercel AI SDK + OpenRouter |
| Vector Store | SQLite + sqlite-vec |
| Documentation | VitePress |

## Output Structure

DeepLens generates docs under `<project>/.deeplens/`:

```
.deeplens/
├── outline.json              # Knowledge outline (concept map)
├── settings.json             # Project-level config overrides
├── deeplens.db               # Vector index (SQLite + sqlite-vec)
└── docs/
    ├── index.md              # Project overview
    ├── summary.md            # Project summary
    ├── domains/
    │   ├── auth-system/
    │   │   ├── index.md      # Hub doc (high-level)
    │   │   ├── jwt-handler.md # Spoke doc (details)
    │   │   └── oauth-flow.md  # Spoke doc (details)
    │   └── data-pipeline/
    │       └── ...
    └── .vitepress/
        └── config.mts        # Auto-generated VitePress config
```

## Q&A Modes

| Mode | Engine | Best For |
|------|--------|----------|
| **Fast Search** | Doc RAG → OpenRouter LLM | Quick questions about architecture, data flows |
| **Deep Search** | Agent Loop + Code RAG + CoT | Implementation details, edge cases, debugging |

## MCP Integration

External coding agents (Cursor, Windsurf) can connect via MCP:

| Tool | Description |
|------|-------------|
| `get_architecture_map` | Get project architecture overview |
| `consult_knowledge_base` | Query documentation (Layer 1) |
| `investigate_implementation` | Deep code analysis (Layer 2) |
| `visualize_data_flow` | Generate Mermaid data flow diagrams |

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck

# Build Tauri desktop app
npm run build:tauri
```

## License

[MIT](LICENSE)
