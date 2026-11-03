import { fail } from "./http";
import { dispatch, type Route } from "./router";
import * as player from "./routes/player";
import * as admin from "./routes/admin";
import * as link from "./routes/link";
import * as diag from "./routes/diag";
import * as errors from "./routes/errors";
import { connect } from "./live";

export { Live } from "./live";

const ID = "([\\w-]{1,64})";

const routes: Route[] = [
  { method: "GET", path: "/api/board", run: player.board },
  { method: "GET", path: "/api/feed", run: player.feed },
  { method: "GET", path: "/api/ecran", run: player.screen },
  { method: "GET", path: "/api/live", run: connect },
  { method: "POST", path: "/api/join", run: player.join },
  { method: "POST", path: "/api/resume", run: player.resume },
  { method: "PATCH", path: "/api/me", run: player.rename },
  { method: "PUT", path: "/api/me/look", run: player.saveLook },
  { method: "POST", path: "/api/me/link", run: link.createLink },
  { method: "DELETE", path: "/api/me/devices", run: link.logoutOthers },
  { method: "POST", path: "/api/link", run: link.useLink },
  { method: "POST", path: "/api/diag", run: diag.report },
  { method: "POST", path: "/api/errors", run: errors.collect },
  { method: "GET", path: new RegExp(`^/api/players/${ID}$`), run: player.card },
  { method: "POST", path: "/api/runs", run: player.startRun },
  { method: "POST", path: new RegExp(`^/api/runs/${ID}$`), run: player.finishRun },

  { method: "POST", path: "/api/admin/login", run: admin.login },
  { method: "POST", path: "/api/admin/accept", run: admin.accept },
  { method: "GET", path: "/api/admin/me", access: "admin", run: admin.me },
  { method: "POST", path: "/api/admin/logout", access: "admin", run: admin.logout },
  { method: "GET", path: "/api/admin/players", access: "admin", run: admin.players },
  { method: "POST", path: new RegExp(`^/api/admin/players/${ID}/ban$`), access: "admin", run: admin.ban },
  { method: "POST", path: "/api/admin/events", access: "admin", run: admin.createEvent },
  { method: "PATCH", path: "/api/admin/events/current", access: "admin", run: admin.updateEvent },
  { method: "GET", path: "/api/admin/team", access: "owner", run: admin.team },
  { method: "POST", path: "/api/admin/merge", access: "owner", run: admin.merge },
  { method: "GET", path: "/api/admin/errors", access: "owner", run: errors.list },
  { method: "GET", path: "/api/admin/errors/recent", access: "owner", run: errors.recent },
  { method: "DELETE", path: new RegExp(`^/api/admin/errors/${ID}$`), access: "owner", run: errors.forget },
  { method: "POST", path: "/api/admin/invites", access: "owner", run: admin.invite },
  { method: "POST", path: new RegExp(`^/api/admin/team/${ID}/revoke$`), access: "owner", run: admin.revoke },
];

export default {
  async fetch(req, env, exec) {
    try {
      return await dispatch(routes, req, env, exec);
    } catch (e) {
      console.error(e);
      return fail(500, "Erreur serveur, réessaie.");
    }
  },
} satisfies ExportedHandler<Env>;
