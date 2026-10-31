import { json, fail, readJson } from "../http";
import type { Ctx } from "../router";

const MAX_LINES = 300, MAX_LEN = 500;

export async function report({ req, env }: Ctx) {
  if (env.APP_VERSION !== "dev") return fail(404, "Introuvable.");
  const { lines } = await readJson(req);
  if (!Array.isArray(lines)) return fail(400, "Rapport invalide.");
  for (const line of lines.slice(0, MAX_LINES)) console.log("[son] " + String(line).slice(0, MAX_LEN));
  return json({ ok: true });
}
