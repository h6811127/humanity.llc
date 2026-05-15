import type { D1Database } from '@cloudflare/workers-types';
import { encodeBase58 } from './validation';

const PROFILE_ID_LENGTH = 20;

export async function generateProfileId(db: D1Database): Promise<string> {
  const existsStmt = db.prepare('SELECT 1 AS x FROM profiles WHERE profile_id = ?');
  for (let attempt = 0; attempt < 64; attempt++) {
    const raw = new Uint8Array(16);
    crypto.getRandomValues(raw);
    const id = encodeBase58(raw).slice(0, PROFILE_ID_LENGTH);
    if (id.length !== PROFILE_ID_LENGTH) continue;
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(id)) continue;
    const row = await existsStmt.bind(id).first<{ x: number }>();
    if (!row) return id;
  }
  throw new Error('profile_id_generation_exhausted');
}
