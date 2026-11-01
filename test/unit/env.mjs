const items = new Map();

globalThis.localStorage = {
  getItem: (k) => (items.has(k) ? items.get(k) : null),
  setItem: (k, v) => items.set(k, String(v)),
  removeItem: (k) => items.delete(k),
  clear: () => items.clear()
};
globalThis.location = { hostname: "test.invalid", search: "" };

export const storageListeners = [];
globalThis.window = { addEventListener: (type, fn) => type === "storage" && storageListeners.push(fn) };

export function fakeCtx() {
  const log = [], values = {}, bad = [];
  const gradient = { addColorStop: () => {} };
  const ctx = new Proxy({}, {
    get(_, k) {
      if (typeof k === "symbol") return undefined;
      if (Object.hasOwn(values, k)) return values[k];
      return (...args) => {
        log.push(k);
        if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) bad.push(k);
        return k.startsWith("create") ? gradient : undefined;
      };
    },
    set(_, k, v) {
      values[k] = v;
      log.push(k + "=" + (typeof v === "object" ? "objet" : v));
      return true;
    }
  });
  return { ctx, log, bad };
}
