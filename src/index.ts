import { Hono } from 'hono';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './mcp/server.js';
import { checkRateLimit } from './lib/rate-limit.js';

export interface Env {
  CACHE: KVNamespace;
  SEARCH_INDEX_URL: string;
  CODE_INDEX_URL: string;
  FRONT_INDEX_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// Global error handler — fail-open: return 503 instead of crashing the Worker.
app.onError((err, c) => {
  console.error('[granit-mcp] Unhandled error:', err.message);
  return c.json(
    { error: 'internal_error', message: 'The MCP server encountered an error. Please retry later.' },
    503,
  );
});

// Rate limiting — 60 req/min per IP (in-memory, resets on cold start)
app.use('*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'unknown';
  const result = checkRateLimit(ip);

  c.header('X-RateLimit-Limit', '60');
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    return c.json(
      { error: 'rate_limited', message: 'Too many requests. Please retry after 1 minute.' },
      429,
    );
  }

  await next();
});

// Health check
app.get('/', (c) => c.json({ name: 'granit-mcp', version: '2.0.0', status: 'ok' }));

// MCP endpoint — Streamable HTTP transport (stateless: one transport per request)
app.all('/mcp', async (c) => {
  const server = createMcpServer(c.env);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

// Catch-all: reject unknown paths early to avoid unnecessary processing
app.all('*', (c) => c.json({ error: 'not_found', endpoints: ['/', '/mcp'] }, 404));

export default app;
