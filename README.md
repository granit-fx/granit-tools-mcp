# granit-docs-mcp

Remote MCP server for [Granit](https://granit-fx.dev) documentation. Allows AI
assistants (Claude Code, Cursor, Windsurf, etc.) to search the framework docs in
real time via the Model Context Protocol.

Powered by a **pre-built JSON search index** running on **Cloudflare Workers**.

## Tools

| Tool | Description |
| ---- | ----------- |
| `search_granit_docs` | Full-text search across the entire documentation |
| `get_module_reference` | Retrieve the complete reference for a specific module |
| `list_patterns` | List all architecture patterns with descriptions |

## Use with Claude Code

Add this to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "granit-docs": {
      "type": "url",
      "url": "https://mcp.granit-fx.dev/mcp"
    }
  }
}
```

## Use with Cursor

Add the MCP server in **Settings > MCP Servers**:

- **Name:** `granit-docs`
- **Type:** `http`
- **URL:** `https://mcp.granit-fx.dev/mcp`

## Local development

```bash
# Install dependencies
pnpm install

# Generate the search index from the docs site
cd ../granit-dotnet/docs-site
node scripts/generate-search-index.mjs

# Serve the built docs locally (includes search-index.json)
python3 -m http.server 4322 -d dist &

# Create .dev.vars to point to local docs
cd ../../granit-docs-mcp
echo 'SEARCH_INDEX_URL=http://localhost:4322/search-index.json' > .dev.vars

# Start local Worker
pnpm dev
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector http://localhost:8787/mcp
```

## Architecture

```text
Claude Code / Cursor
  └── MCP Streamable HTTP
        └── Cloudflare Worker (granit-docs-mcp)
              ├── search_granit_docs ─────┐
              ├── get_module_reference ───┤── fetch granit-fx.dev/search-index.json
              └── list_patterns ──────────┘   (KV cache 24 h)
```

- A `search-index.json` is generated at docs build time by
  `docs-site/scripts/generate-search-index.mjs` in the `granit-dotnet` repo
- Each entry has: title, description, URL, category, platform, content
- The Worker fetches the index from CF Pages and caches it in KV for 24 hours
- Search uses TF-IDF scoring with weighted fields (title 5x, description 3x)
- Module reference matches by URL slug, title, or fuzzy partial
- Auto-updated: each docs deploy produces a fresh index; KV TTL handles cache

### Search index categories

| Category | Source path | Count |
| -------- | ----------- | ----- |
| `module` | `/dotnet/{core,data,security,api,...}/` | ~69 |
| `pattern` | `/dotnet/architecture/patterns/` | ~56 |
| `adr` | `/dotnet/architecture/adr/` | ~26 |
| `guide` | `/dotnet/guides/` | ~25 |
| `frontend` | `/frontend/` | ~25 |
| `concept` | `/dotnet/concepts/` | ~12 |
| `community` | `/contributing/`, `/troubleshooting/` | ~13 |
| `getting-started` | `/dotnet/getting-started/` | ~8 |

## Deployment

Automatic on push to `main` or when triggered by `granit-dotnet` after a docs
deploy (`repository_dispatch: docs-deployed`).

### Required secrets

| Secret | Purpose |
| ------ | ------- |
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy to Cloudflare Workers |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

## License

Apache-2.0
