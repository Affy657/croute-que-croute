import { json, fail, readJson, clientIp, allowed, tooFast } from "../http";
import type { Ctx } from "../router";

const MAX_LINES = 300, MAX_LEN = 500, TEXT_MAX = 16000, KEEP_MS = 14 * 24 * 3600 * 1000, KEEP_ROWS = 2000;

export async function report({ req, env }: Ctx) {
  const body = await readJson(req);
  if (!Array.isArray(body.lines)) return fail(400, "Rapport invalide.");
  const lines = body.lines.slice(0, MAX_LINES).map((line) => String(line).slice(0, MAX_LEN));
  if (typeof body.kind !== "string") {
    if (env.APP_VERSION !== "dev") return fail(404, "Introuvable.");
    for (const line of lines) console.log("[son] " + line);
    return json({ ok: true });
  }
  if (!(await allowed(env.SOUND_LIMIT, clientIp(req)))) return tooFast();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sound_reports WHERE created_at < ? OR id <= (SELECT MAX(id) FROM sound_reports) - ?").bind(now - KEEP_MS, KEEP_ROWS),
    env.DB.prepare("INSERT INTO sound_reports (created_at, kind, version, standalone, ua, lines) VALUES (?, ?, ?, ?, ?, ?)").bind(
      now,
      body.kind.slice(0, 80),
      String(body.version ?? "").slice(0, 40),
      body.standalone ? 1 : 0,
      String(body.ua ?? "").slice(0, 300),
      lines.join("\n").slice(0, TEXT_MAX),
    ),
  ]);
  return json({ ok: true });
}
