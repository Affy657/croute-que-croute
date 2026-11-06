import { json, fail, clientIp, allowed, tooFast } from "../http";
import { sha256 } from "../security";
import type { Ctx } from "../router";

const BODY_MAX = 64 * 1024, BATCH = 5, TRAIL_LINES = 30, COUNT_MAX = 100000, HOUR_ROWS = 60, SESSION_ROWS = 10;
const KEEP_MS = 14 * 24 * 3600 * 1000, KEEP_ROWS = 2000, GROUPS = 50, RECENT_ROWS = 200;
const HOUR_MS = 3600 * 1000, DAY_MS = 24 * HOUR_MS;
const KINDS = ["erreur", "promesse", "fichier", "csp", "blocage"];
const PLATFORMS = ["iPhone", "iPad", "Android", "PC"];

interface ErrorRow {
  kind: string;
  message: string;
  source: string;
  stack: string;
  trail: string;
  device: string;
  count: number;
  fingerprint: string;
}

interface GroupRow {
  fingerprint: string;
  total: number;
  sessions: number;
  first_at: number;
  last_at: number;
  versions: number;
  current: number;
}

interface LastRow {
  fingerprint: string;
  kind: string;
  message: string;
  source: string;
  stack: string;
  trail: string;
  device: string;
  page: string;
  version: string;
  platform: string;
  standalone: number;
  ua: string;
}

const text = (raw: unknown, max: number) => (typeof raw === "string" ? raw : "").slice(0, max);

const lines = (raw: unknown) =>
  Array.isArray(raw) ? raw.slice(-TRAIL_LINES).map((line) => String(line).slice(0, 200)).join("\n") : "";

const fingerprint = async (kind: string, message: string, source: string) =>
  (await sha256([kind, message.replace(/\d+/g, "#"), source.replace(/:\d+:\d+$/, "")].join("|"))).slice(0, 16);

function clean(raw: unknown): Omit<ErrorRow, "fingerprint"> | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const kind = text(e.kind, 20), message = text(e.message, 300);
  if (!KINDS.includes(kind) || !message) return null;
  const count = Math.min(Math.max(Math.floor(Number(e.count)) || 1, 1), COUNT_MAX);
  return { kind, message, source: text(e.source, 200), stack: text(e.stack, 4000), trail: lines(e.trail), device: text(e.device, 80), count };
}

export async function collect({ req, env }: Ctx) {
  if (Number(req.headers.get("content-length")) > BODY_MAX) return fail(413, "Rapport trop gros.");
  const raw = await req.text();
  if (raw.length > BODY_MAX) return fail(413, "Rapport trop gros.");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Rapport invalide.");
  }
  const found = body && Array.isArray(body.errors) ? body.errors.slice(0, BATCH).map(clean).filter((e) => e !== null) : [];
  if (!found.length) return fail(400, "Rapport invalide.");
  if (!(await allowed(env.ERROR_IP_LIMIT, clientIp(req))) || !(await allowed(env.ERROR_LIMIT, "toutes"))) return tooFast();
  const now = Date.now();
  const session = /^[a-f0-9]{16}$/.test(String(body.session)) ? String(body.session) : "";
  const used = await env.DB.prepare(
    `SELECT COUNT(*) AS n, SUM(session = ?2) AS mine FROM (SELECT session FROM client_errors WHERE created_at > ?1 LIMIT ${HOUR_ROWS})`,
  )
    .bind(now - HOUR_MS, session)
    .first<{ n: number; mine: number | null }>();
  const room = Math.min(HOUR_ROWS - (used?.n ?? 0), SESSION_ROWS - (used?.mine ?? 0));
  if (room <= 0) return tooFast();
  const rows: ErrorRow[] = await Promise.all(found.slice(0, room).map(async (e) => ({ ...e, fingerprint: await fingerprint(e.kind, e.message, e.source) })));
  const platform = PLATFORMS.includes(body.platform as string) ? (body.platform as string) : "PC";
  if (env.APP_VERSION === "dev") for (const e of rows) console.log(`[erreur] ${e.kind} x${e.count} ${e.message} ${e.source}`);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM client_errors WHERE created_at < ?").bind(now - KEEP_MS),
    env.DB.prepare("DELETE FROM client_errors WHERE id <= (SELECT MAX(id) FROM client_errors) - ?").bind(KEEP_ROWS - rows.length),
    ...rows.map((e) =>
      env.DB.prepare(
        `INSERT INTO client_errors (created_at, fingerprint, kind, message, source, stack, trail, device, count, session, page, version, platform, standalone, ua)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        now,
        e.fingerprint,
        e.kind,
        e.message,
        e.source,
        e.stack,
        e.trail,
        e.device,
        e.count,
        session,
        text(body.page, 60),
        text(body.version, 40),
        platform,
        body.standalone === true ? 1 : 0,
        text(body.ua, 300),
      ),
    ),
  ]);
  return json({ ok: true });
}

export async function list({ env }: Ctx) {
  const [groups, last, platforms] = await env.DB.batch([
    env.DB.prepare(
      `SELECT fingerprint, SUM(count) AS total, COUNT(DISTINCT session) AS sessions, MIN(created_at) AS first_at, MAX(created_at) AS last_at,
              COUNT(DISTINCT version) AS versions, MAX(version = ?1) AS current
       FROM client_errors GROUP BY fingerprint ORDER BY last_at DESC LIMIT ?2`,
    ).bind(env.APP_VERSION, GROUPS),
    env.DB.prepare(
      `SELECT fingerprint, kind, message, source, stack, trail, device, page, version, platform, standalone, ua
       FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY fingerprint ORDER BY trail <> '' DESC, id DESC) AS n FROM client_errors)
       WHERE n = 1`,
    ),
    env.DB.prepare("SELECT fingerprint, platform, COUNT(DISTINCT session) AS n FROM client_errors GROUP BY fingerprint, platform"),
  ]);
  const lastOf = new Map((last.results as LastRow[]).map((r) => [r.fingerprint, r]));
  const spread = new Map<string, Record<string, number>>();
  for (const r of platforms.results as { fingerprint: string; platform: string; n: number }[]) {
    spread.set(r.fingerprint, { ...spread.get(r.fingerprint), [r.platform]: r.n });
  }
  return json({
    groups: (groups.results as GroupRow[]).map((g) => {
      const l = lastOf.get(g.fingerprint)!;
      return {
        id: g.fingerprint,
        kind: l.kind,
        message: l.message,
        source: l.source,
        count: g.total,
        sessions: g.sessions,
        firstAt: g.first_at,
        lastAt: g.last_at,
        versions: g.versions,
        onCurrent: !!g.current,
        platforms: spread.get(g.fingerprint) ?? {},
        last: {
          stack: l.stack,
          trail: l.trail,
          device: l.device,
          page: l.page,
          version: l.version,
          platform: l.platform,
          standalone: !!l.standalone,
          ua: l.ua,
        },
      };
    }),
  });
}

export async function recent({ env }: Ctx) {
  const now = Date.now();
  const distinct = (since: number) =>
    env.DB.prepare(`SELECT COUNT(DISTINCT fingerprint) AS n FROM (SELECT fingerprint FROM client_errors WHERE created_at > ? ORDER BY created_at DESC LIMIT ${RECENT_ROWS})`).bind(since);
  const [hour, day] = await env.DB.batch<{ n: number }>([distinct(now - HOUR_MS), distinct(now - DAY_MS)]);
  return json({ hour: hour.results[0]?.n ?? 0, day: day.results[0]?.n ?? 0 });
}

export async function forget({ env, params }: Ctx) {
  const res = await env.DB.prepare("DELETE FROM client_errors WHERE fingerprint = ?").bind(params[0]).run();
  return res.meta.changes ? json({ ok: true }) : fail(404, "Erreur inconnue.");
}
