import { Router, Request, Response } from 'express';

const router = Router();

interface ProviderConfig {
  provider_id: string;
  display_name: string;
  base_url: string;
  auth_header_name: string;
  auth_prefix: string;
  models_endpoint: string;
  chat_endpoint: string;
  sync_enabled: boolean;
  sync_frequency_hrs: number;
  deprecation_url: string | null;
}

interface PatchProviderConfig {
  display_name?: string;
  base_url?: string;
  auth_header_name?: string;
  auth_prefix?: string;
  models_endpoint?: string;
  chat_endpoint?: string;
  sync_enabled?: boolean;
  sync_frequency_hrs?: number;
  deprecation_url?: string | null;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { pool: dbPool } = await import('../index');
    const result = await dbPool.query(
      'SELECT provider_id, display_name, base_url, auth_header_name, auth_prefix, models_endpoint, chat_endpoint, sync_enabled, sync_frequency_hrs, deprecation_url FROM provider_config ORDER BY provider_id'
    );
    res.json(result.rows as ProviderConfig[]);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch provider configs: ${err.message}` });
  }
});

router.get('/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const { pool: dbPool } = await import('../index');
    const result = await dbPool.query(
      'SELECT provider_id, display_name, base_url, auth_header_name, auth_prefix, models_endpoint, chat_endpoint, sync_enabled, sync_frequency_hrs, deprecation_url FROM provider_config WHERE provider_id = $1',
      [providerId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Provider config not found' });
      return;
    }
    res.json(result.rows[0] as ProviderConfig);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch provider config: ${err.message}` });
  }
});

router.patch('/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const updates = req.body as PatchProviderConfig;
    const allowedFields: (keyof PatchProviderConfig)[] = [
      'display_name', 'base_url', 'auth_header_name', 'auth_prefix',
      'models_endpoint', 'chat_endpoint', 'sync_enabled', 'sync_frequency_hrs', 'deprecation_url'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        values.push(updates[field]);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(providerId);
    const query = `UPDATE provider_config SET ${setClauses.join(', ')}, updated_at = NOW() WHERE provider_id = $${idx} RETURNING *`;
    const result = await (await import('../index')).pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Provider config not found' });
      return;
    }

    res.json(result.rows[0] as ProviderConfig);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to update provider config: ${err.message}` });
  }
});

export default router;