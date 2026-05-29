import { Router, Request, Response } from 'express';
import { triggerSyncNow } from '../jobs/modelSync';

const router = Router();

interface DiscoverRequest {
  providerId: string;
  baseUrl: string;
  apiKey?: string;
}

/**
 * Provider-specific model list endpoint configurations.
 * Each provider has a unique API shape for listing models.
 * These are kept as fallback when LiteLLM is unreachable.
 */
const PROVIDER_API: Record<string, {
  endpoint: string;
  authScheme?: string;
  responseParser: (body: any) => Array<{ id: string; name?: string; object?: string }>;
}> = {
  openai: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.data?.filter((m: any) => m.object === 'model' || !m.object) ?? [],
  },
  anthropic: {
    endpoint: '/models',
    authScheme: 'x-api-key',
    responseParser: (body) => body.data ?? [],
  },
  google: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.models ?? [],
  },
  mistral: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.data ?? [],
  },
  cohere: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.models ?? [],
  },
  together: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.data ?? [],
  },
  groq: {
    endpoint: '/models',
    authScheme: 'Bearer',
    responseParser: (body) => body.data ?? [],
  },
};

/**
 * LiteLLM-compatible provider prefixes.
 * Maps providerId to the prefix used in LiteLLM's model names.
 */
const LITELLM_PROVIDER_PREFIX: Record<string, string> = {
  openai: 'openai/',
  anthropic: 'anthropic/',
  google: 'gemini/',
  gemini: 'gemini/',
  mistral: 'mistral/',
  cohere: 'cohere/',
  together: 'together_ai/',
  groq: 'groq/',
};

/**
 * Try to discover models via LiteLLM's /model/info endpoint.
 * Returns null if LiteLLM is unreachable.
 */
async function discoverViaLiteLLM(providerId: string): Promise<Array<{ id: string; name: string }> | null> {
  const litellmUrl = process.env.LITELLM_URL || 'http://litellm:4000';
  const masterKey = process.env.LITELLM_MASTER_KEY || '';

  const prefix = LITELLM_PROVIDER_PREFIX[providerId];
  if (!prefix) {
    // Unknown provider — LiteLLM won't have it
    return null;
  }

  try {
    const response = await fetch(`${litellmUrl}/model/info`, {
      headers: {
        Authorization: `Bearer ${masterKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json() as { data?: Array<{
      model_name: string;
      litellm_params: { model: string };
    }> };

    const models = body.data ?? [];

    // Filter models whose litellm_params.model starts with the provider prefix
    const filtered = models.filter((m) =>
      m.litellm_params?.model?.startsWith(prefix)
    );

    return filtered.map((m) => ({
      id: m.litellm_params.model,
      name: m.model_name,
    }));
  } catch {
    // LiteLLM unreachable (connection refused, timeout, etc.)
    return null;
  }
}

/**
 * Fallback: discover models by calling the provider's API directly.
 */
async function discoverViaProvider(
  providerId: string,
  baseUrl: string,
  apiKey?: string
): Promise<Array<{ id: string; name: string }>> {
  const provider = PROVIDER_API[providerId];
  if (!provider) {
    return [];
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey) {
    if (provider.authScheme === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    } else {
      headers['Authorization'] = `${provider.authScheme} ${apiKey}`;
    }
  }

  const url = `${baseUrl.replace(/\/+$/, '')}${provider.endpoint}`;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

  if (!response.ok) {
    throw new Error(`Provider API returned ${response.status}`);
  }

  const body = await response.json();
  const rawModels = provider.responseParser(body);

  return rawModels.map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
  }));
}

router.post('/discover', async (req: Request, res: Response) => {
  const { providerId, baseUrl, apiKey } = req.body as DiscoverRequest;

  if (!providerId || !baseUrl) {
    res.status(400).json({ error: 'providerId and baseUrl are required' });
    return;
  }

  // Step 1: Try LiteLLM first
  try {
    const litellmModels = await discoverViaLiteLLM(providerId);
    if (litellmModels !== null) {
      res.json({ models: litellmModels });
      return;
    }
  } catch {
    // Fall through to direct provider call
  }

  // Step 2: Fallback — call the provider's API directly
  try {
    const models = await discoverViaProvider(providerId, baseUrl, apiKey);
    res.json({ models });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      res.status(504).json({ error: 'Provider API timed out' });
    } else {
      res.status(502).json({ error: `Failed to fetch models: ${err.message}` });
    }
  }
});

// ─── Changelog & Sync Routes ─────────────────────────────────────────────────

/**
 * GET /api/models/changelog
 * Returns unseen changelog entries grouped by provider.
 */
router.get('/changelog', async (req: Request, res: Response) => {
  try {
    const { pool: dbPool } = await import('../index');
    const result = await dbPool.query(
      `SELECT id, provider_id, change_type, model_id, model_name, detail, created_at
       FROM model_changelog
       WHERE seen = FALSE
       ORDER BY provider_id, created_at DESC`
    );

    const changes: Record<string, any[]> = {};
    for (const row of result.rows) {
      const pid = row.provider_id;
      if (!changes[pid]) changes[pid] = [];
      changes[pid].push({
        id: row.id,
        changeType: row.change_type,
        modelId: row.model_id,
        modelName: row.model_name,
        detail: row.detail,
        createdAt: row.created_at,
      });
    }

    res.json({
      hasChanges: Object.keys(changes).length > 0,
      changes,
      lastChecked: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch changelog: ${err.message}` });
  }
});

/**
 * POST /api/models/changelog/apply
 * Marks changelog entries as seen for given providers.
 * Returns the current snapshots for those providers.
 */
router.post('/changelog/apply', async (req: Request, res: Response) => {
  try {
    const { providerIds } = req.body as { providerIds: string[] };

    if (!Array.isArray(providerIds) || providerIds.length === 0) {
      res.status(400).json({ error: 'providerIds array is required' });
      return;
    }

    const { pool: dbPool } = await import('../index');

    // Mark entries as seen
    await dbPool.query(
      `UPDATE model_changelog SET seen = TRUE
       WHERE provider_id = ANY($1::text[]) AND seen = FALSE`,
      [providerIds],
    );

    // Fetch updated snapshots for these providers
    const snapshotResult = await dbPool.query(
      `SELECT provider_id, models, updated_at
       FROM model_snapshots
       WHERE provider_id = ANY($1::text[])`,
      [providerIds],
    );

    const snapshots: Record<string, any[]> = {};
    for (const row of snapshotResult.rows) {
      snapshots[row.provider_id] = row.models;
    }

    res.json({ snapshots });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to apply changes: ${err.message}` });
  }
});

/**
 * POST /api/models/sync/trigger
 * Manually triggers the sync job immediately.
 */
router.post('/sync/trigger', async (req: Request, res: Response) => {
  try {
    const { pool: dbPool } = await import('../index');
    triggerSyncNow(dbPool);
    res.json({ status: 'triggered' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to trigger sync: ${err.message}` });
  }
});

/**
 * GET /api/models/snapshot/:providerId
 * Returns the current full snapshot for a provider.
 */
router.get('/snapshot/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { pool: dbPool } = await import('../index');

    const result = await dbPool.query(
      `SELECT provider_id, models, updated_at
       FROM model_snapshots
       WHERE provider_id = $1`,
      [providerId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No snapshot found for this provider' });
      return;
    }

    res.json({
      providerId: result.rows[0].provider_id,
      models: result.rows[0].models,
      updatedAt: result.rows[0].updated_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch snapshot: ${err.message}` });
  }
});

export default router;