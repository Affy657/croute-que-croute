interface EventRow {
  id: number;
  name: string;
  closes_at: number;
}

interface PlayerRow {
  id: string;
  pseudo: string;
  best: number;
  best_at: number | null;
  banned: number;
}

interface RunRow {
  id: string;
  started_at: number;
  finished_at: number | null;
}

const GRACE_MS = 5 * 60 * 1000;
const SLACK_MS = 500;
const TOP = 50;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const fail = (status: number, error: string) => json({ error }, status);

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function pseudoKey(pseudo: string) {
  return pseudo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanPseudo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const pseudo = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (pseudo.length < 2 || pseudo.length > 16) return null;
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(pseudo)) return null;
  if (pseudoKey(pseudo).length < 2) return null;
  return pseudo;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const currentEvent = (env: Env) =>
  env.DB.prepare("SELECT id, name, closes_at FROM events ORDER BY id DESC LIMIT 1").first<EventRow>();

function bearer(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function findPlayer(req: Request, env: Env, eventId: number) {
  const token = bearer(req);
  if (!token) return null;
  return env.DB.prepare("SELECT id, pseudo, best, best_at, banned FROM players WHERE token = ? AND event_id = ?")
    .bind(token, eventId)
    .first<PlayerRow>();
}

async function rankOf(env: Env, eventId: number, player: PlayerRow) {
  if (player.banned || player.best <= 0) return null;
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM players WHERE event_id = ?1 AND banned = 0 AND (best > ?2 OR (best = ?2 AND best_at < ?3))",
  )
    .bind(eventId, player.best, player.best_at)
    .first<{ n: number }>();
  return (row?.n ?? 0) + 1;
}

async function countOf(env: Env, eventId: number) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM players WHERE event_id = ? AND banned = 0 AND best > 0")
    .bind(eventId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function board(req: Request, env: Env) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return json({ event: null, now, top: [], me: null, count: 0 });
  const me = await findPlayer(req, env, event.id);
  const { results } = await env.DB.prepare(
    "SELECT id, pseudo, best FROM players WHERE event_id = ? AND banned = 0 AND best > 0 ORDER BY best DESC, best_at ASC LIMIT ?",
  )
    .bind(event.id, TOP)
    .all<{ id: string; pseudo: string; best: number }>();
  const top = results.map((row, i) => ({ rank: i + 1, pseudo: row.pseudo, best: row.best, me: me?.id === row.id }));
  return json({
    event: { name: event.name, closesAt: event.closes_at },
    now,
    top,
    count: await countOf(env, event.id),
    me: me ? { pseudo: me.pseudo, best: me.best, rank: await rankOf(env, event.id, me) } : null,
  });
}

async function join(req: Request, env: Env) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  if (now >= event.closes_at) return fail(403, "Le classement est fermé.");
  const pseudo = cleanPseudo((await readJson(req)).pseudo);
  if (!pseudo) return fail(400, "Pseudo de 2 à 16 caractères : lettres, chiffres, espaces, tirets.");
  const token = randomToken();
  try {
    await env.DB.prepare(
      "INSERT INTO players (id, event_id, pseudo, pseudo_key, token, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), event.id, pseudo, pseudoKey(pseudo), token, now)
      .run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  return json({ token, pseudo }, 201);
}

async function startRun(req: Request, env: Env) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  if (now >= event.closes_at) return fail(403, "Le classement est fermé.");
  const me = await findPlayer(req, env, event.id);
  if (!me) return fail(401, "Joueur inconnu.");
  if (me.banned) return fail(403, "Tu as été retiré du classement.");
  const runId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO runs (id, player_id, started_at) VALUES (?, ?, ?)").bind(runId, me.id, now).run();
  return json({ runId }, 201);
}

async function finishRun(req: Request, env: Env, runId: string) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  const me = await findPlayer(req, env, event.id);
  if (!me) return fail(401, "Joueur inconnu.");
  const run = await env.DB.prepare("SELECT id, started_at, finished_at FROM runs WHERE id = ? AND player_id = ?")
    .bind(runId, me.id)
    .first<RunRow>();
  if (!run) return fail(404, "Partie inconnue.");
  if (run.finished_at) return fail(409, "Partie déjà enregistrée.");
  if (now > event.closes_at + GRACE_MS) return fail(403, "Le classement est fermé.");
  const score = (await readJson(req)).score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0) return fail(400, "Score invalide.");
  if (score * 10 > now - run.started_at + SLACK_MS) return fail(422, "Score refusé.");
  await env.DB.prepare("UPDATE runs SET finished_at = ?, score = ? WHERE id = ?").bind(now, score, run.id).run();
  let improved = false;
  if (!me.banned) {
    const res = await env.DB.prepare("UPDATE players SET best = ?, best_at = ? WHERE id = ? AND best < ?")
      .bind(score, now, me.id, score)
      .run();
    improved = res.meta.changes > 0;
    if (improved) {
      me.best = score;
      me.best_at = now;
    }
  }
  return json({ best: me.best, improved, rank: await rankOf(env, event.id, me), count: await countOf(env, event.id) });
}

async function adminPlayers(env: Env) {
  const event = await currentEvent(env);
  if (!event) return json({ event: null, players: [] });
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.pseudo, p.best, p.banned, COUNT(r.id) AS runs
     FROM players p LEFT JOIN runs r ON r.player_id = p.id
     WHERE p.event_id = ?
     GROUP BY p.id
     ORDER BY p.banned ASC, p.best DESC, p.best_at ASC`,
  )
    .bind(event.id)
    .all();
  return json({ event: { name: event.name, closesAt: event.closes_at }, players: results });
}

async function adminCreateEvent(req: Request, env: Env) {
  const body = await readJson(req);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const closesAt = body.closesAt;
  if (!name || name.length > 60) return fail(400, "Nom de soirée de 1 à 60 caractères.");
  if (typeof closesAt !== "number" || !Number.isFinite(closesAt) || closesAt <= Date.now()) {
    return fail(400, "L'heure de fin doit être dans le futur.");
  }
  await env.DB.prepare("INSERT INTO events (name, closes_at, created_at) VALUES (?, ?, ?)")
    .bind(name, Math.round(closesAt), Date.now())
    .run();
  return json({ ok: true }, 201);
}

async function adminUpdateEvent(req: Request, env: Env) {
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  const closesAt = (await readJson(req)).closesAt;
  if (typeof closesAt !== "number" || !Number.isFinite(closesAt)) return fail(400, "Heure de fin invalide.");
  await env.DB.prepare("UPDATE events SET closes_at = ? WHERE id = ?").bind(Math.round(closesAt), event.id).run();
  return json({ ok: true });
}

async function adminBan(req: Request, env: Env, playerId: string) {
  const banned = (await readJson(req)).banned === true ? 1 : 0;
  const res = await env.DB.prepare("UPDATE players SET banned = ? WHERE id = ?").bind(banned, playerId).run();
  if (!res.meta.changes) return fail(404, "Joueur inconnu.");
  return json({ ok: true });
}

async function route(req: Request, env: Env) {
  const { pathname } = new URL(req.url);
  const method = req.method;

  if (pathname === "/api/board" && method === "GET") return board(req, env);
  if (pathname === "/api/join" && method === "POST") return join(req, env);
  if (pathname === "/api/runs" && method === "POST") return startRun(req, env);
  const run = pathname.match(/^\/api\/runs\/([\w-]{1,64})$/);
  if (run && method === "POST") return finishRun(req, env, run[1]);

  if (pathname.startsWith("/api/admin/")) {
    if (!env.ADMIN_KEY || req.headers.get("x-admin-key") !== env.ADMIN_KEY) return fail(401, "Clé admin incorrecte.");
    if (pathname === "/api/admin/players" && method === "GET") return adminPlayers(env);
    if (pathname === "/api/admin/events" && method === "POST") return adminCreateEvent(req, env);
    if (pathname === "/api/admin/events/current" && method === "PATCH") return adminUpdateEvent(req, env);
    const ban = pathname.match(/^\/api\/admin\/players\/([\w-]{1,64})\/ban$/);
    if (ban && method === "POST") return adminBan(req, env, ban[1]);
  }

  return fail(404, "Introuvable.");
}

export default {
  async fetch(req, env) {
    try {
      return await route(req, env);
    } catch (e) {
      console.error(e);
      return fail(500, "Erreur serveur, réessaie.");
    }
  },
} satisfies ExportedHandler<Env>;
