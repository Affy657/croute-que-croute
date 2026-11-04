import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export class DurableObject {}", shortCircuit: true };
    if (context.parentURL?.endsWith(".ts") && /^\.\.?\/[^.]+$/.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

export function database() {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync("migrations").sort()) db.exec(readFileSync("migrations/" + file, "utf8"));
  const changes = (sql, args) => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } });
  const statement = (sql, args = []) => ({
    sql,
    args,
    bind: (...values) => statement(sql, values),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => changes(sql, args),
  });
  const d1 = {
    db,
    before: null,
    prepare: (sql) => statement(sql),
    async batch(list) {
      if (d1.before) await d1.before(list);
      db.exec("BEGIN");
      try {
        const out = list.map((s) => (/^\s*SELECT/i.test(s.sql) ? { results: db.prepare(s.sql).all(...s.args) } : changes(s.sql, s.args)));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  return d1;
}
