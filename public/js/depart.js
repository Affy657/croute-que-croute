import { VERSION } from "./version.js";
import { store, KEYS } from "./shared/store.js";
import { timeout } from "./shared/timeout.js";
import { moveUrl } from "./app/move.js";

const WAIT_MS = 4000;

async function linkCode() {
  const token = store.get(KEYS.playerToken);
  if (!token) return null;
  try {
    const res = await fetch("/api/me/link", { method: "POST", headers: { authorization: "Bearer " + token, "x-app-version": VERSION }, signal: timeout(WAIT_MS) });
    return res.ok ? (await res.json()).code : null;
  } catch (e) {
    return null;
  }
}

location.replace(moveUrl(await linkCode()));
