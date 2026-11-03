import { DurableObject } from "cloudflare:workers";
import { fail, clientIp, allowed, tooFast } from "./http";
import type { Ctx } from "./router";

const MAX_SCREENS = 20, PER_IP = 4;
const open = (list: WebSocket[]) => list.filter((ws) => ws.readyState === WebSocket.OPEN);

export class Live extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(req: Request) {
    const ip = clientIp(req), mine = open(this.ctx.getWebSockets(ip));
    if (mine.length >= PER_IP) mine.reduce((a, b) => (b.deserializeAttachment() < a.deserializeAttachment() ? b : a)).close(4000, "Remplacé par un nouvel écran.");
    if (open(this.ctx.getWebSockets()).length >= MAX_SCREENS) return fail(503, "Trop d'écrans connectés.");
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server, [ip]);
    server.serializeAttachment(Date.now());
    return new Response(null, { status: 101, webSocket: client });
  }

  tell() {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send("change");
      } catch {}
    }
  }

  webSocketMessage() {}

  webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code);
    } catch {}
  }
}

const screens = (env: Env) => env.LIVE.get(env.LIVE.idFromName("ecran"));

export async function connect({ req, env }: Ctx) {
  if (req.headers.get("upgrade") !== "websocket") return fail(426, "Connexion en direct seulement.");
  if (!(await allowed(env.LIVE_LIMIT, "live:" + clientIp(req)))) return tooFast();
  return screens(env).fetch(req);
}

export function tell(env: Env, exec?: ExecutionContext) {
  const sent = screens(env).tell().catch(() => {});
  exec?.waitUntil(sent);
}
