import { Router, Request, Response } from 'express';
const router = Router();

router.get('/account/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const { pool } = await import('../index');
    const [account, quota, wallet, postpaid] = await Promise.all([
      pool.query('SELECT * FROM user_accounts WHERE user_id = $1', [userId]),
      pool.query('SELECT * FROM free_quotas WHERE user_id = $1', [userId]),
      pool.query('SELECT balance_usd, status, auto_topup_enabled, auto_topup_threshold FROM wallets WHERE user_id = $1', [userId]),
      pool.query('SELECT accrued_usd, credit_limit_usd, next_bill_date, payment_status FROM postpaid_accounts WHERE user_id = $1', [userId]),
    ]);
    res.json({
      account: account.rows[0] || null,
      quota: quota.rows[0] || null,
      wallet: wallet.rows[0] || null,
      postpaid: postpaid.rows[0] || null,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/usage/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const { pool } = await import('../index');
    const result = await pool.query(`
      SELECT
        model_id, provider_id,
        COUNT(*) AS calls,
        SUM(input_tokens + output_tokens) AS total_tokens,
        SUM(total_cost_usd)::numeric(14,6) AS total_cost,
        ROUND(AVG(latency_ms)::numeric, 0) AS avg_latency_ms,
        ROUND(100.0 * SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) / COUNT(*), 1) AS success_rate
      FROM usage_log
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY model_id, provider_id
      ORDER BY calls DESC
    `, [userId]);
    res.json({ usage: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/notifications/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const { pool } = await import('../index');
    const result = await pool.query(
      `SELECT * FROM billing_notifications WHERE user_id = $1 ORDER BY sent_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ notifications: result.rows });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/wallet/topup', async (req: Request, res: Response) => {
  const { userId, amountUsd } = req.body;
  if (!userId || !amountUsd) { res.status(400).json({ error: 'userId and amountUsd required' }); return; }
  try {
    const { pool } = await import('../index');
    await pool.query(
      `UPDATE wallets SET balance_usd = balance_usd + $2, last_topup_at = NOW(), last_topup_amount = $2, updated_at = NOW()
       WHERE user_id = $1`,
      [userId, amountUsd]
    );
    const r = await pool.query('SELECT balance_usd FROM wallets WHERE user_id = $1', [userId]);
    res.json({ success: true, newBalance: r.rows[0]?.balance_usd });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;