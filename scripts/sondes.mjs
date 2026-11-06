import { OFF_GIT } from "./garde.mjs";

const LIVE_MS = 5000, DOMAIN_MS = 8000;

export const SOUNDS = OFF_GIT.map((file) => file.replace(/^public/, ""));

export const socketUrl = (base) => base.replace(/^http/, "ws") + "/api/live";

export function pingLive(url, { Socket = WebSocket, ms = LIVE_MS } = {}) {
  return new Promise((done) => {
    let ws;
    const end = (why) => {
      clearTimeout(timer);
      done(why);
      ws?.close();
    };
    const timer = setTimeout(() => end(`pas de pong en ${ms} ms`), ms);
    try {
      ws = new Socket(url);
    } catch {
      end("connexion impossible");
      return;
    }
    ws.addEventListener("open", () => ws.send("ping"));
    ws.addEventListener("message", (e) => e.data === "pong" && end(null));
    ws.addEventListener("error", () => end("connexion refusée"));
    ws.addEventListener("close", () => end("fermée avant le pong"));
  });
}

export async function fakeRun(base, version, ask = fetch) {
  const headers = { authorization: "Bearer verif-faux-jeton", "content-type": "application/json", "x-app-version": version };
  const res = await ask(`${base}/api/runs`, { method: "POST", redirect: "manual", headers, body: "{}" }).catch(() => null);
  return res ? res.status : 0;
}

export async function domainProblem(base, ask = fetch) {
  const options = { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(DOMAIN_MS) };
  const board = await ask(`${base}/api/board?verif=${Date.now()}`, options).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return Array.isArray(board?.top) ? null : "pas de réponse, une box peut garder un vieux DNS";
}

export const brokenOf = (paths, statuses) => paths.flatMap((path, i) => (statuses[i] === 200 ? [] : [`${path} (${statuses[i]})`]));

export function verdict(lines) {
  const counted = lines.filter((line) => !line.startsWith("AVERT"));
  return { failed: counted.filter((line) => line.startsWith("FAIL")).length, total: counted.length };
}
