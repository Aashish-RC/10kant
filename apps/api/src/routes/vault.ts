import { Router, Request, Response } from 'express';
import * as infisical from '../services/infisical.service';
import { updateModelsForProvider } from '../services/litellm.service';

const router = Router();

// POST /api/vault/keys — store a key (with LiteLLM sync)
router.post('/keys', async (req: Request, res: Response) => {
  const { providerId, providerName, rawKey } = req.body;
  if (!providerId || !rawKey) {
    res.status(400).json({ error: 'providerId and rawKey are required' });
    return;
  }

  try {
    const entry = await infisical.saveKey(providerId, providerName || providerId, rawKey);

    // Sync the key to LiteLLM so it can use it for model routing
    const syncResult = await updateModelsForProvider(providerId, rawKey);

    res.json({
      ...entry,
      litellmSync: syncResult,
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to save key: ${err.message}` });
  }
});

// GET /api/vault/keys — list all key metadata (never exposes raw keys)
router.get('/keys', async (_req: Request, res: Response) => {
  try {
    const entries = await infisical.listKeys();
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list keys: ${err.message}` });
  }
});

// GET /api/vault/keys/:providerId/resolve — resolve a key (used by engine at call-time)
router.get('/keys/:providerId/resolve', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  try {
    const rawKey = await infisical.resolveKey(providerId);
    if (!rawKey) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.json({ providerId, rawKey });
  } catch {
    res.status(500).json({ error: 'Failed to resolve key' });
  }
});

// DELETE /api/vault/keys/:providerId — revoke a key
router.delete('/keys/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  try {
    const deleted = await infisical.revokeKey(providerId);
    if (!deleted) {
      res.status(404).json({ error: 'Key not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to revoke key: ${err.message}` });
  }
});

// PATCH /api/vault/keys/:providerId/status — update validation status (transient)
router.patch('/keys/:providerId/status', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { isValid } = req.body;

  infisical.setValidationStatus(providerId, isValid === null ? null : Boolean(isValid));

  res.json({
    success: true,
    isValid: infisical.getValidationStatus(providerId),
  });
});

export default router;