import { Router, Request, Response } from 'express';

const router = Router();

interface DiscoverRequest {
  providerId: string;
  baseUrl: string;
  apiKey?: string;
}

/**
 * Provider-specific model list endpoint configurations.
 * Each provider has a unique API shape for listing models.
 */
const PROVIDER_API: Record<string, {
  endpoint: string;          // path appended to baseUrl
  authScheme?: string;       // e.g. 'Bearer', 'api-key', 'x-api-key'
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

router.post('/discover', async (req: Request, res: Response) => {
  const { providerId, baseUrl, apiKey } = req.body as DiscoverRequest;

  if (!providerId || !baseUrl) {
    res.status(400).json({ error: 'providerId and baseUrl are required' });
    return;
  }

  const provider = PROVIDER_API[providerId];
  if (!provider) {
    // For unknown providers (ollama, custom) return empty — they handle locally
    res.json({ models: [] });
    return;
  }

  try {
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
      res.status(response.status).json({ error: `Provider API returned ${response.status}` });
      return;
    }

    const body = await response.json();
    const rawModels = provider.responseParser(body);

    // Normalize to a consistent shape
    const models = rawModels.map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
    }));

    res.json({ models });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
      res.status(504).json({ error: 'Provider API timed out' });
    } else {
      res.status(502).json({ error: `Failed to fetch models: ${err.message}` });
    }
  }
});

export default router;