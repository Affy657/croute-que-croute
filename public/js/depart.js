import { VERSION } from "./version.js";
import { store, KEYS } from "./shared/store.js";
import { timeout } from "./shared/timeout.js";
import { moveUrl } from "./app/move.js";

const TRY_MS = 3500, GAP_MS = 500, ALL_MS = 8000;
const until = Date.now() + ALL_MS;

/** @param {string} path @param {string} [token] */
async function ask(path, token) {
  /** @type {Record<string, string>} */
  const headers = { "x-app-version": VERSION };
  if (token) headers.authorization = "Bearer " + token;
  const res = await fetch(path, { method: "POST", headers, signal: timeout(Math.max(1, Math.min(TRY_MS, until - Date.now()))) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** @param {string} token @returns {Promise<string | null>} */
async function linkCode(token) {
  for (let i = 0; i < 2; i++) {
    try {
      const { code } = await ask("/api/me/link", token);
      if (code) return code;
    } catch (e) {}
    if (!i) await new Promise((ok) => setTimeout(ok, GAP_MS));
  }
  return null;
}

async function findCode() {
  let token = store.get(KEYS.playerToken);
  if (!token) {
    try {
      token = (await ask("/api/resume")).token;
    } catch (e) {
      return { code: null, retry: true };
    }
  }
  const code = token ? await linkCode(token) : null;
  return { code, retry: !!token && !code };
}

const { code, retry } = await findCode();
location.replace(moveUrl(code, retry));
