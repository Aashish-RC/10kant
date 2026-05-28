import { Pool } from 'pg';

export async function ensureSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_snapshots (
        provider_id TEXT PRIMARY KEY,
        models JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS model_changelog (
        id SERIAL PRIMARY KEY,
        provider_id TEXT NOT NULL,
        change_type TEXT NOT NULL,
        model_id TEXT NOT NULL,
        model_name TEXT,
        detail TEXT,
        seen BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Index for deduplication: find existing unseen entries per (provider, model, change_type)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_changelog_dedup
      ON model_changelog (provider_id, model_id, change_type)
      WHERE seen = FALSE
    `);

    // Index for listing unseen entries grouped by provider
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_changelog_unseen
      ON model_changelog (provider_id, created_at DESC)
      WHERE seen = FALSE
    `);

    await client.query('COMMIT');
    console.log('[db] Schema ensured: model_snapshots, model_changelog');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[db] Failed to ensure schema:', err);
    throw err;
  } finally {
    client.release();
  }
}