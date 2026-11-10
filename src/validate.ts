import { GEAR, SPREADS } from "../public/js/shared/palette.js";

const LIGATURES: Record<string, string> = { "œ": "oe", "Œ": "OE", "æ": "ae", "Æ": "AE", "ß": "ss", "ø": "o", "Ø": "O" };

const stripAccents = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[œŒæÆßøØ]/g, (c) => LIGATURES[c]);

export const pseudoKey = (pseudo: string) => stripAccents(pseudo).toLowerCase().replace(/[^a-z0-9]/g, "");

export function cleanPseudo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const pseudo = raw.normalize("NFC").replace(/[\u2018\u2019\u02BC]/g, "'").replace(/\s+/g, " ").trim();
  if (pseudo.length < 2 || pseudo.length > 16) return null;
  if (/\p{M}/u.test(pseudo)) return null;
  if (!/^[A-Za-z0-9 _.'-]+$/.test(stripAccents(pseudo))) return null;
  if (pseudoKey(pseudo).length < 2) return null;
  return pseudo;
}

export function cleanName(raw: unknown) {
  const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  return name && name.length <= 30 ? name : null;
}

export const cleanRole = (raw: unknown) => (raw === "owner" || raw === "admin" ? raw : null);

export const cleanClientId = (raw: unknown) => (typeof raw === "string" && /^[a-f0-9]{32}$/.test(raw) ? raw : null);

export const LINK_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const LINK_LENGTH = 8;

export function cleanLinkCode(raw: unknown) {
  const code = typeof raw === "string" ? raw.toUpperCase().replace(/[\s-]/g, "") : "";
  return code.length === LINK_LENGTH && [...code].every((c) => LINK_CHARS.includes(c)) ? code : null;
}

export const LOOK_SLOTS = ["head", "side", "bread", "aura", "spread"] as const;
const GEAR_SLOT = new Map(Object.entries(GEAR).map(([kind, g]) => [kind, g.slot]));
const lookKind = (slot: string, kind: unknown) =>
  typeof kind === "string" && (slot === "spread" ? Object.hasOwn(SPREADS, kind) : GEAR_SLOT.get(kind) === slot) ? kind : null;
const LOOK_MAX = 99;

const lookCount = (raw: unknown) => (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= LOOK_MAX ? raw : 0);
const lookAt = (raw: unknown) => (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < PROGRESS_AT_MAX ? raw : 0);

export function cleanLook(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const own = (r.own && typeof r.own === "object" ? r.own : {}) as Record<string, unknown>;
  const kinds = LOOK_SLOTS.map((s) => [s, lookKind(s, r[s])]);
  return JSON.stringify({
    ...Object.fromEntries(kinds),
    ach: lookCount(r.ach),
    own: Object.fromEntries(LOOK_SLOTS.map((s) => [s, lookCount(own[s])])),
    at: lookAt(r.at),
  });
}

export interface Progress {
  got: Record<string, number>;
  attacks: string[];
  toppings: string[];
}

const PROGRESS_ID = /^[A-Za-z0-9]{1,24}$/;
const PROGRESS_MAX = 100;
const PROGRESS_AT_MAX = 1e14;

const progressIds = (raw: unknown) =>
  Array.isArray(raw) ? [...new Set(raw.filter((v): v is string => typeof v === "string" && PROGRESS_ID.test(v)))].slice(0, PROGRESS_MAX) : [];

export function cleanProgress(raw: unknown): Progress | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const got = r.got && typeof r.got === "object" ? Object.entries(r.got as Record<string, unknown>) : [];
  return {
    got: Object.fromEntries(
      got
        .filter((e): e is [string, number] => PROGRESS_ID.test(e[0]) && typeof e[1] === "number" && Number.isInteger(e[1]) && e[1] > 0 && e[1] < PROGRESS_AT_MAX)
        .slice(0, PROGRESS_MAX),
    ),
    attacks: progressIds(r.attacks),
    toppings: progressIds(r.toppings),
  };
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const got = new Map(Object.entries(a.got));
  for (const [id, at] of Object.entries(b.got)) got.set(id, Math.min(got.get(id) ?? at, at));
  return {
    got: Object.fromEntries([...got].slice(0, PROGRESS_MAX)),
    attacks: progressIds([...a.attacks, ...b.attacks]),
    toppings: progressIds([...a.toppings, ...b.toppings]),
  };
}
