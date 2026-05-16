export interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/hello") {
        return Response.json({ message: "Welcome to your empire!" });
      }

      return await env.ASSETS.fetch(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: "worker_exception", message }, { status: 500 });
    }
  },
};