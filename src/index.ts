import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './mcp/server.js';

export interface Env {
  DOCS_CACHE: KVNamespace;
  SEARCH_INDEX_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// Health check
app.get('/', (c) => c.json({ name: 'granit-docs-mcp', version: '1.0.0', status: 'ok' }));

// MCP endpoint — Streamable HTTP transport (stateless: one transport per request)
app.all('/mcp', async (c) => {
  const server = createMcpServer(c.env);

  // Stateless mode: no session management (CF Workers are ephemeral)
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export default app;
