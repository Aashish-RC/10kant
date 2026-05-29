import { Router, Request, Response } from 'express';
const router = Router();

router.get('/log', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../index');
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const userId = req.query.userId as string | undefined;
    const modelId = req.query.modelId as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`); }
    if (modelId) { params.push(modelId); conditions.push(`model_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const result = await pool.query(
      `SELECT * FROM usage_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );

    res.json({ log: result.rows, count: result.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../index');
    const result = await pool.query(`
      SELECT
        model_id,
        provider_id,
        COUNT(*) AS total_calls,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_calls,
        ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms,
        SUM(input_tokens) AS total_input_tokens,
        SUM(output_tokens) AS total_output_tokens,
        SUM(total_cost_usd)::numeric(14,6) AS total_cost_usd,
        MAX(created_at) AS last_used_at
      FROM usage_log
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY model_id, provider_id
      ORDER BY total_calls DESC
    `);
    res.json({ summary: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;