import { Router, Request, Response } from 'express';
const router = Router();

router.get('/scores', async (req: Request, res: Response) => {
  try {
    const { pool } = await import('../index');
    const { getCachedScores } = await import('../services/scoring.service');
    const scores = await getCachedScores(pool);
    res.json({ scores });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;