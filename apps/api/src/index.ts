import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { Pool } from 'pg';

config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
import modelsRouter from './routes/models';
import vaultRouter from './routes/vault';
app.use('/api/models', modelsRouter);
app.use('/api/vault', vaultRouter);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

// Expose pool for routes/jobs that need it
export { pool };

(async () => {
  try {
    const result = await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');

    // Ensure database schema (tables + indexes)
    const { ensureSchema } = await import('./db/migrations');
    await ensureSchema(pool);

    // Start background model sync job
    const { startModelSync } = await import('./jobs/modelSync');
    startModelSync(pool);
  } catch (err) {
    console.error('PostgreSQL connection error (non-fatal):', err);
  }
})();

const spineNodes = [
  { id: 'node-orchestrator', nodeType: 'orchestrator', classification: 'fixed', status: 'live', label: 'Orchestrator', description: 'Central coordination. Every task passes through here.', position: { x: 400, y: 150 } },
  { id: 'node-model-hub', nodeType: 'model-hub', classification: 'fixed', status: 'live', label: 'Model', description: 'Central model registry. All model providers connect here.', position: { x: 400, y: 320 } },
  { id: 'node-memory-hub', nodeType: 'memory-hub', classification: 'fixed', status: 'live', label: 'Memory', description: 'Memory palace. 4 tiers, 5 lanes, full knowledge governance.', position: { x: 160, y: 235 } },
  { id: 'node-connector-hub', nodeType: 'connector-hub', classification: 'fixed', status: 'live', label: 'Connectors', description: 'All external connections. Apps, APIs, MCP servers.', position: { x: 640, y: 235 } },
  { id: 'node-credential-vault', nodeType: 'credential-vault', classification: 'fixed', status: 'live', label: 'Vault', description: 'Encrypted credential store. Never exposed, always resolved at call time.', position: { x: 400, y: 490 } }
];

app.get('/', (req, res) => {
  res.json({ message: 'RA1 API is running' });
});

app.get('/api/nodes/spine', (req, res) => {
  res.json(spineNodes);
});

app.post('/api/chat', async (req, res) => {
  const litellmUrl = process.env.LITELLM_URL || 'http://litellm:4000';
  const masterKey = process.env.LITELLM_MASTER_KEY || '';
  const model = req.body.model || 'gpt-4o-mini';
  const message = req.body.message;

  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  try {
    const response = await fetch(`${litellmUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${masterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
      }),
    });

    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: unknown };
    res.json({
      response: data.choices?.[0]?.message?.content || '',
      model,
      usage: data.usage || {},
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy chat request' });
  }
});

app.listen(port, () => {
  console.log(`RA1 API server running on port ${port}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));