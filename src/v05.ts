import type { D1Database } from '@cloudflare/workers-types';
import QRCode from 'qrcode';
import { generateProfileId } from './profile-id';
import {
  handleIssue,
  manifestoIssue,
  sanitizeManifesto,
  isValidPublicKeyBase58,
  isValidProfileId,
} from './validation';
import { profilePageHtml } from './html';
import { randomBytesBase64Url, sha256HexUtf8, timingSafeEqualHex } from './crypto-util';

const BASE = '/.well-known/hc/v0.5';

const MSG = {
  handleFormat:
    'Handle must be 3–32 characters: lowercase letters, numbers, underscore. Must start with a letter.',
  handleReserved: 'This handle is reserved. Please choose another.',
  manifestoEmpty: 'Manifesto line must be 1–280 characters of plain text.',
  manifestoLong: 'Manifesto line cannot exceed 280 characters.',
};

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CONSTITUTION_LINK: string;
  GOVERNANCE_LINK: string;
}

type ProfileRow = {
  profile_id: string;
  handle: string;
  manifesto_line: string;
  public_key: string;
  created_at: number;
  updated_at: number;
  revoked: number;
  revoked_at: number | null;
  revocation_secret_hash: string | null;
};

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get('Accept');
  if (!accept) return true;
  if (accept.includes('text/html')) return true;
  if (accept.includes('application/json')) return false;
  return true;
}

function publicOrigin(request: Request): string {
  return new URL(request.url).origin;
}

function v05Url(request: Request, suffix: string): string {
  return `${publicOrigin(request)}${BASE}${suffix}`;
}

function profileJson(env: Env, row: ProfileRow) {
  return {
    version: '0.5',
    profile_id: row.profile_id,
    handle: row.handle,
    manifesto_line: row.manifesto_line,
    badge: { type: 'early_builder', label: 'Early Builder' },
    created_at: row.created_at,
    revoked: Boolean(row.revoked),
    constitution_link: env.CONSTITUTION_LINK,
    governance_link: env.GOVERNANCE_LINK,
  };
}

async function getProfileRow(db: D1Database, profileId: string): Promise<ProfileRow | null> {
  if (!isValidProfileId(profileId)) return null;
  const row = await db.prepare('SELECT * FROM profiles WHERE profile_id = ?').bind(profileId).first<ProfileRow>();
  return row ?? null;
}

const bootMs = Date.now();

export async function handleV05(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sub = url.pathname.slice(BASE.length) || '/';
  const method = request.method.toUpperCase();

  if (method === 'GET' && sub === '/health') {
    try {
      await env.DB.prepare('SELECT 1').first();
      return json({
        status: 'ok',
        version: '0.5',
        uptime: Math.floor((Date.now() - bootMs) / 1000),
        database: 'connected',
      });
    } catch (e) {
      return json(
        {
          status: 'error',
          version: '0.5',
          uptime: Math.floor((Date.now() - bootMs) / 1000),
          database: 'error',
          message: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      );
    }
  }

  if (method === 'POST' && sub === '/profiles') {
    let body: { handle?: string; manifesto_line?: string; public_key?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
    }

    const hi = handleIssue(body.handle);
    if (hi === 'format') return json({ error: 'invalid_handle', message: MSG.handleFormat }, { status: 400 });
    if (hi === 'reserved') return json({ error: 'invalid_handle', message: MSG.handleReserved }, { status: 400 });

    const mi = manifestoIssue(body.manifesto_line);
    if (mi === 'too_long') return json({ error: 'invalid_manifesto', message: MSG.manifestoLong }, { status: 400 });
    if (mi === 'empty') return json({ error: 'invalid_manifesto', message: MSG.manifestoEmpty }, { status: 400 });

    if (!isValidPublicKeyBase58(body.public_key)) {
      return json(
        {
          error: 'invalid_public_key',
          message:
            'public_key must be a valid Ed25519 public key in base58 (32 bytes when decoded; typically ~44 characters).',
        },
        { status: 400 }
      );
    }

    const manifesto_line = sanitizeManifesto(body.manifesto_line);
    const now = Math.floor(Date.now() / 1000);
    const profile_id = await generateProfileId(env.DB);
    const revocationSecret = randomBytesBase64Url(16);
    const revocation_secret_hash = await sha256HexUtf8(revocationSecret);

    try {
      await env.DB
        .prepare(
          `INSERT INTO profiles (
            profile_id, handle, manifesto_line, public_key,
            created_at, updated_at, revoked, revocation_secret_hash
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        )
        .bind(profile_id, body.handle, manifesto_line, body.public_key, now, now, revocation_secret_hash)
        .run();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('UNIQUE')) {
        return json(
          { error: 'handle_taken', message: 'This handle is already in use. Please choose another.' },
          { status: 409 }
        );
      }
      console.error(e);
      return json({ error: 'server_error', message: 'Database error' }, { status: 500 });
    }

    return json(
      {
        success: true,
        profile_id,
        handle: body.handle,
        manifesto_line,
        qr_code_url: v05Url(request, `/qr/${profile_id}.png`),
        profile_url: v05Url(request, `/profile/${profile_id}`),
        revocation_secret: revocationSecret,
        created_at: now,
      },
      { status: 201 }
    );
  }

  const profileMatch = sub.match(/^\/profile\/([^/]+)$/);
  if (method === 'GET' && profileMatch) {
    const profileId = profileMatch[1];
    const row = await getProfileRow(env.DB, profileId);
    if (!row) {
      if (wantsHtml(request)) {
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not found</title></head><body><p>No profile exists with this ID. The QR code may be invalid or revoked.</p></body></html>',
          { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      return json({ error: 'not_found', message: 'Profile not found' }, { status: 404 });
    }
    if (row.revoked) {
      if (wantsHtml(request)) {
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Revoked</title></head><body><p class="revoked-notice">⛔ This profile has been revoked</p></body></html>',
          { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
      return json({ error: 'revoked', message: 'This profile has been revoked' }, { status: 410 });
    }

    const body = profileJson(env, row);
    const servedAtIso = new Date().toISOString();
    const h = new Headers();
    h.set('Cache-Control', 'public, max-age=3600');
    h.set('X-Resolver-Version', '0.5');
    if (wantsHtml(request)) {
      h.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(
        profilePageHtml(
          { ...body, revoked: false },
          {
            constitutionLink: env.CONSTITUTION_LINK,
            governanceLink: env.GOVERNANCE_LINK,
            servedAtIso,
          }
        ),
        { headers: h }
      );
    }
    return json(body, { headers: h });
  }

  const qrMatch = sub.match(/^\/qr\/([^/]+)$/);
  if (method === 'GET' && qrMatch) {
    const m = String(qrMatch[1]).match(/^([1-9A-HJ-NP-Za-km-z]{20})\.png$/i);
    if (!m) return new Response('Invalid QR path', { status: 400 });
    const profileId = m[1];
    const row = await getProfileRow(env.DB, profileId);
    if (!row) return new Response('Not found', { status: 404 });
    if (row.revoked) return new Response('Revoked', { status: 410 });

    const size = Math.min(1000, Math.max(100, Number(url.searchParams.get('size')) || 300));
    const margin = Math.min(10, Math.max(1, Number(url.searchParams.get('margin')) || 4));
    const eccRaw = (url.searchParams.get('ecc') || 'M').toUpperCase();
    const ecc = ['L', 'M', 'Q', 'H'].includes(eccRaw) ? (eccRaw as 'L' | 'M' | 'Q' | 'H') : 'M';

    try {
      const png = await QRCode.toBuffer(`hc://resolve/${profileId}`, {
        type: 'png',
        width: size,
        margin,
        errorCorrectionLevel: ecc,
      });
      return new Response(png as unknown as BodyInit, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (e) {
      console.error(e);
      return new Response('QR generation failed', { status: 500 });
    }
  }

  if (method === 'POST' && sub === '/revoke') {
    let body: { profile_id?: string; revocation_secret?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: 'bad_request', message: 'Invalid JSON' }, { status: 400 });
    }
    const profileId = body.profile_id;
    const secret = body.revocation_secret;
    if (!profileId || !secret) {
      return json({ error: 'bad_request', message: 'profile_id and revocation_secret are required' }, { status: 400 });
    }
    if (!isValidProfileId(profileId)) {
      return json({ error: 'invalid_profile_id', message: 'Invalid profile_id' }, { status: 400 });
    }

    const row = await env.DB.prepare('SELECT * FROM profiles WHERE profile_id = ?').bind(profileId).first<ProfileRow>();
    if (!row) return json({ error: 'not_found', message: 'Profile not found' }, { status: 404 });
    if (row.revoked) return json({ error: 'revoked', message: 'Profile already revoked' }, { status: 410 });

    const expected = row.revocation_secret_hash ?? '';
    const candidate = await sha256HexUtf8(String(secret));
    if (!timingSafeEqualHex(candidate, expected)) {
      return json(
        { error: 'invalid_secret', message: 'Revocation failed. Check your secret and try again.' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare('UPDATE profiles SET revoked = 1, revoked_at = ? WHERE profile_id = ?').bind(now, profileId).run();

    return json({
      success: true,
      message: 'Profile revoked. QR codes will return 410 Gone within 1 hour.',
    });
  }

  return json({ error: 'not_found', message: 'Not found' }, { status: 404 });
}
