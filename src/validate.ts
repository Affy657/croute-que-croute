const stripAccents = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const pseudoKey = (pseudo: string) => stripAccents(pseudo).toLowerCase().replace(/[^a-z0-9]/g, "");

export function cleanPseudo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const pseudo = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (pseudo.length < 2 || pseudo.length > 16) return null;
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
