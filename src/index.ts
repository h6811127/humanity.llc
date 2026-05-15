import { handleV05, type Env } from './v05';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/.well-known/hc/v0.5')) {
      return handleV05(request, env);
    }

    if (url.pathname === '/sw.js') {
      const assetUrl = new URL('/commons/sw.js', url.origin);
      const assetReq = new Request(assetUrl.toString(), { headers: request.headers });
      const res = await env.ASSETS.fetch(assetReq);
      const headers = new Headers(res.headers);
      headers.set('Service-Worker-Allowed', '/');
      headers.set('Content-Type', 'application/javascript; charset=utf-8');
      return new Response(res.body, { status: res.status, headers });
    }

    return env.ASSETS.fetch(request);
  },
};
