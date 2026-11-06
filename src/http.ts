export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const fail = (status: number, error: string) => json({ error }, status);

const BODY_MAX = 64 * 1024;

export async function cappedText(req: Request) {
  if (Number(req.headers.get("content-length")) > BODY_MAX) throw new Error("Corps trop gros.");
  const reader = req.body?.getReader();
  const decoder = new TextDecoder();
  let text = "", size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_MAX) {
      await reader.cancel();
      throw new Error("Corps trop gros.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data: unknown = JSON.parse(await cappedText(req));
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function bearer(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function network(ip: string) {
  if (!ip.includes(":")) return ip;
  if (ip.includes(".")) return ip.slice(ip.lastIndexOf(":") + 1);
  const [head, tail = ""] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [], right = tail ? tail.split(":") : [];
  const zeros = ip.includes("::") ? Array<string>(Math.max(0, 8 - left.length - right.length)).fill("0") : [];
  return [...left, ...zeros, ...right].slice(0, 4).map((part) => part.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export const clientIp = (req: Request) => network(req.headers.get("cf-connecting-ip") ?? "local");

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
