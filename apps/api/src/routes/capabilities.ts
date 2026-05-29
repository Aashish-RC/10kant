import { Router, Request, Response } from 'express';
const router = Router();

router.get('/tags', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../index');
    const result = await pool.query(`
      SELECT DISTINCT unnest(capabilities) AS tag
      FROM model_registry
      WHERE capabilities IS NOT NULL
      ORDER BY tag
    `);
    res.json({ tags: result.rows.map(r => r.tag) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/models/:modelId', async (req: Request, res: Response) => {
  const { modelId } = req.params;
  const { providerId, capabilities } = req.body as { providerId: string; capabilities: string[] };
  if (!providerId || !Array.isArray(capabilities)) {
    res.status(400).json({ error: 'providerId and capabilities array required' });
    return;
  }
  try {
    const { pool } = await import('../index');
    await pool.query(
      `UPDATE model_registry SET capabilities = $1, updated_at = NOW()
       WHERE model_id = $2 AND provider_id = $3`,
      [capabilities, modelId, providerId]
    );
    res.json({ success: true, modelId, capabilities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/models', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../index');
    const result = await pool.query(`
      SELECT model_id, provider_id, display_name, capabilities, status
      FROM model_registry
      ORDER BY provider_id, model_id
    `);
    res.json({ models: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recommend', async (req: Request, res: Response) => {
  const { requiredTags = [], preferredTags = [], limit = 5 } = req.body as {
    requiredTags?: string[];
    preferredTags?: string[];
    limit?: number;
  };

  try {
    const { pool } = await import('../index');

    const result = await pool.query(`
      SELECT
        model_id,
        provider_id,
        display_name,
        capabilities,
        input_cost_per_1k,
        output_cost_per_1k,
        context_window,
        (
          SELECT COUNT(*) FROM unnest($2::text[]) t WHERE t = ANY(capabilities)
        ) AS preferred_match_count
      FROM model_registry
      WHERE status = 'active'
        AND ($1::text[] <@ capabilities OR $1::text[] = '{}')
      ORDER BY preferred_match_count DESC, input_cost_per_1k ASC NULLS LAST
      LIMIT $3
    `, [requiredTags, preferredTags, limit]);

    res.json({ recommendations: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;