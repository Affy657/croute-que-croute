export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const fail = (status: number, error: string) => json({ error }, status);

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function bearer(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? "local";

export const outdated = (req: Request, env: Env) => req.headers.get("x-app-version") !== env.APP_VERSION;

export const updateRequired = () => fail(426, "Nouvelle version du jeu : recharge la page.");

export const tooFast = () => fail(429, "Doucement : réessaie dans quelques secondes.");

export async function allowed(limiter: RateLimit | undefined, key: string) {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}
