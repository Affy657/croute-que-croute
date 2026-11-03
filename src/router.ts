import { fail, tooFast } from "./http";
import { adminAuth, type AdminAuth } from "./routes/admin";

export interface Ctx {
  req: Request;
  env: Env;
  params: string[];
  auth?: AdminAuth;
  exec?: ExecutionContext;
}

type Access = "public" | "admin" | "owner";

export interface Route {
  method: string;
  path: string | RegExp;
  access?: Access;
  run: (ctx: Ctx) => Promise<Response>;
}

function match(route: Route, method: string, pathname: string) {
  if (route.method !== method) return null;
  if (typeof route.path === "string") return route.path === pathname ? [] : null;
  const m = pathname.match(route.path);
  return m ? m.slice(1) : null;
}

export async function dispatch(routes: Route[], req: Request, env: Env, exec?: ExecutionContext) {
  const { pathname } = new URL(req.url);
  for (const route of routes) {
    const params = match(route, req.method, pathname);
    if (!params) continue;
    const access = route.access ?? "public";
    const ctx: Ctx = { req, env, params, exec };
    if (access !== "public") {
      const auth = await adminAuth(req, env);
      if (auth === "slow") return tooFast();
      if (!auth) return fail(401, "Connexion admin expirée ou retirée.");
      if (access === "owner" && auth.role !== "owner") return fail(403, "Réservé au propriétaire.");
      ctx.auth = auth;
    }
    return route.run(ctx);
  }
  return fail(404, "Introuvable.");
}
