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

export function outdated(req: Request, env: Env, previousOk = false) {
  const version = req.headers.get("x-app-version");
  return version !== env.APP_VERSION && !(previousOk && !!version && version === env.APP_PREVIOUS);
}

export const updateRequired = () => fail(426, "Nouvelle version du jeu : recharge la page.");

export const tooFast = () => fail(429, "Doucement : réessaie dans quelques secondes.");

const KEY_COOKIE = "cv_cle", KEY_COOKIE_S = 400 * 24 * 3600;

export function cookie(req: Request, name: string) {
  const pair = (req.headers.get("cookie") ?? "").split(";").map((p) => p.trim()).find((p) => p.startsWith(name + "="));
  return pair ? pair.slice(name.length + 1) : "";
}

export const keyCookie = (req: Request) => cookie(req, KEY_COOKIE);

export function withKey(res: Response, token: string | null) {
  res.headers.append("set-cookie", `${KEY_COOKIE}=${token ?? ""}; Max-Age=${token ? KEY_COOKIE_S : 0}; Path=/api; Secure; HttpOnly; SameSite=Strict`);
  return res;
}

export async function allowed(limiter: RateLimit | undefined, key: string) {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}
