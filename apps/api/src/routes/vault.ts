import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// The encryption key is derived from env var — must be set and stable across restarts
// In production, use a proper KMS or Infisical itself to bootstrap this key
function getEncryptionKey(): Buffer {
  const raw = process.env.VAULT_ENCRYPTION_KEY || process.env.INFISICAL_ENCRYPTION_KEY || 'ra1-default-vault-key-change-me-1234567890';
  return crypto.scryptSync(raw, 'ra1-vault-salt', 32);
}

const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// In-memory store (backed by a DB in production — here for simplicity)
// Key structure: providerId -> { encryptedKey, providerName, createdAt, lastTested, isValid }
const _keys: Record<string, {
  encryptedKey: string;
  providerName: string;
  createdAt: number;
  lastUpdated: number;
  isValid: boolean | null;
}> = {};

// Also store a masked version for display
function maskKey(raw: string): string {
  if (raw.length <= 8) return '••••••••';
  return raw.slice(0, 4) + '••••' + raw.slice(-4);
}

// POST /api/vault/keys — store a key
router.post('/keys', (req: Request, res: Response) => {
  const { providerId, providerName, rawKey } = req.body;
  if (!providerId || !rawKey) {
    res.status(400).json({ error: 'providerId and rawKey are required' });
    return;
  }

  const encryptedKey = encrypt(rawKey);
  const now = Date.now();
  _keys[providerId] = {
    encryptedKey,
    providerName: providerName || providerId,
    createdAt: now,
    lastUpdated: now,
    isValid: null,
  };

  res.json({
    providerId,
    providerName: _keys[providerId].providerName,
    maskedValue: maskKey(rawKey),
    lastUpdated: now,
    isValid: null,
  });
});

// GET /api/vault/keys — list all key metadata (never exposes raw keys)
router.get('/keys', (_req: Request, res: Response) => {
  const entries = Object.entries(_keys).map(([providerId, entry]) => {
    // We need to decrypt partially just to get the masked value
    try {
      const rawKey = decrypt(entry.encryptedKey);
      return {
        providerId,
        providerName: entry.providerName,
        maskedValue: maskKey(rawKey),
        lastUpdated: entry.lastUpdated,
        isValid: entry.isValid,
      };
    } catch {
      return {
        providerId,
        providerName: entry.providerName,
        maskedValue: '••••••••',
        lastUpdated: entry.lastUpdated,
        isValid: entry.isValid,
      };
    }
  });

  res.json(entries);
});

// GET /api/vault/keys/:providerId — resolve a key (used by engine at call-time)
router.get('/keys/:providerId/resolve', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const entry = _keys[providerId];
  if (!entry) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }

  try {
    const rawKey = decrypt(entry.encryptedKey);
    res.json({ providerId, rawKey });
  } catch {
    res.status(500).json({ error: 'Failed to decrypt key' });
  }
});

// DELETE /api/vault/keys/:providerId — revoke a key
router.delete('/keys/:providerId', (req: Request, res: Response) => {
  const { providerId } = req.params;
  if (!_keys[providerId]) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }

  delete _keys[providerId];
  res.json({ success: true });
});

// PATCH /api/vault/keys/:providerId/status — update validation status
router.patch('/keys/:providerId/status', (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { isValid } = req.body;
  if (!_keys[providerId]) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }

  _keys[providerId].isValid = isValid === null ? null : Boolean(isValid);
  _keys[providerId].lastUpdated = Date.now();

  res.json({ success: true, isValid: _keys[providerId].isValid });
});

export default router;