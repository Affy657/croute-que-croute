import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brokenOf, domainProblem, fakeRun, pingLive, socketUrl, SOUNDS, verdict } from "../../scripts/sondes.mjs";

const BASE = "https://exemple.test";

function fakeSocket(script) {
  const made = [];
  class Socket {
    sent = [];
    closed = 0;
    heard = {};
    constructor(url) {
      this.url = url;
      made.push(this);
      queueMicrotask(() => script(this));
    }
    addEventListener(name, run) {
      this.heard[name] = run;
    }
    send(text) {
      this.sent.push(text);
    }
    close() {
      this.closed++;
    }
  }
  return { Socket, made };
}

test("vérification : les sons demandés sont les 6 fichiers hors git, vus depuis la racine du site", () => {
  assert.deepEqual(SOUNDS, ["/music/theme.m4a", "/sfx/death.mp3", "/sfx/first.mp3", "/sfx/near.mp3", "/sfx/record.mp3", "/sfx/start.mp3"]);
});

test("vérification : la connexion en direct part de l'adresse de la prod", () => {
  assert.equal(socketUrl("https://exemple.test"), "wss://exemple.test/api/live");
  assert.equal(socketUrl("http://127.0.0.1:8808"), "ws://127.0.0.1:8808/api/live");
});

test("vérification : ping, pong, puis la connexion est fermée", async () => {
  const { Socket, made } = fakeSocket((ws) => {
    ws.heard.open();
    assert.deepEqual(ws.sent, ["ping"]);
    ws.heard.message({ data: "pong" });
  });
  assert.equal(await pingLive("wss://x", { Socket, ms: 1000 }), null);
  assert.equal(made[0].closed, 1);
});

test("vérification : un changement du direct reçu avant le pong ne compte pas pour un pong", { timeout: 2000 }, async () => {
  const { Socket, made } = fakeSocket((ws) => {
    ws.heard.open();
    ws.heard.message({ data: "change" });
  });
  assert.match(await pingLive("wss://x", { Socket, ms: 20 }), /pas de pong en 20 ms/);
  assert.equal(made[0].closed, 1);
});

test("vérification : sans pong, le délai rend la main et ferme la connexion", { timeout: 2000 }, async () => {
  const { Socket, made } = fakeSocket(() => {});
  assert.match(await pingLive("wss://x", { Socket, ms: 20 }), /pas de pong/);
  assert.equal(made[0].closed, 1);
});

test("vérification : connexion refusée ou fermée avant le pong", async () => {
  const refused = fakeSocket((ws) => ws.heard.error());
  assert.equal(await pingLive("wss://x", { Socket: refused.Socket, ms: 1000 }), "connexion refusée");
  const dropped = fakeSocket((ws) => ws.heard.close());
  assert.equal(await pingLive("wss://x", { Socket: dropped.Socket, ms: 1000 }), "fermée avant le pong");
  class Impossible {
    constructor() {
      throw new Error("adresse illisible");
    }
  }
  assert.equal(await pingLive("wss://x", { Socket: Impossible, ms: 1000 }), "connexion impossible");
});

test("vérification : le faux envoi de partie porte un faux jeton et le bon numéro de version", async () => {
  const calls = [];
  const status = await fakeRun(BASE, "1.2.0+abc", async (url, options) => (calls.push({ url, options }), { status: 401 }));
  assert.equal(status, 401);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, BASE + "/api/runs");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["x-app-version"], "1.2.0+abc");
  assert.match(calls[0].options.headers.authorization, /^Bearer verif-/);
});

test("vérification : le faux envoi rend le code reçu, ou 0 sans réseau", async () => {
  assert.equal(await fakeRun(BASE, "v", async () => ({ status: 426 })), 426);
  assert.equal(await fakeRun(BASE, "v", async () => { throw new Error("réseau"); }), 0);
});

test("vérification : l'adresse .fr répond avec un classement, ou donne un simple motif", async () => {
  const answer = (ok, data) => async () => ({ ok, json: async () => data });
  assert.equal(await domainProblem(BASE, answer(true, { top: [] })), null);
  assert.match(await domainProblem(BASE, answer(false, null)), /vieux DNS/);
  assert.match(await domainProblem(BASE, answer(true, {})), /vieux DNS/);
  assert.match(await domainProblem(BASE, async () => { throw new Error("DNS"); }), /vieux DNS/);
});

test("vérification : seul ce qui ne répond pas 200 est listé, avec son code", () => {
  assert.deepEqual(brokenOf(["/a", "/b", "/c"], [200, 404, 0]), ["/b (404)", "/c (0)"]);
  assert.deepEqual(brokenOf(["/a"], [200]), []);
});

test("vérification : un avertissement ne compte ni comme échec ni dans le total", () => {
  assert.deepEqual(verdict(["OK   a", "AVERT b -> pas de réponse", "OK   c"]), { failed: 0, total: 2 });
  assert.deepEqual(verdict(["OK   a", "FAIL b -> 500", "AVERT c -> pas de réponse"]), { failed: 1, total: 2 });
});

test("vérification : l'adresse .fr ne peut qu'avertir, et le script n'écrit rien en ligne", () => {
  const verif = readFileSync("scripts/verif.mjs", "utf8");
  assert.match(verif, /warn\(`adresse \$\{DOMAIN\}`, await domainProblem\(DOMAIN\)\)/);
  assert.match(verif, /const \{ failed, total \} = verdict\(results\)/);
  assert.doesNotMatch(verif, /"(POST|PUT|PATCH|DELETE)"/);
  const sondes = readFileSync("scripts/sondes.mjs", "utf8");
  assert.deepEqual(sondes.match(/method: "\w+"/g), ['method: "POST"']);
  assert.match(sondes, /\/api\/runs`, \{ method: "POST"/);
});

test("vérification : ni son ni direct ni faux envoi ne sont oubliés", () => {
  const verif = readFileSync("scripts/verif.mjs", "utf8");
  for (const step of ['get(p, "HEAD")', "await pingLive(socketUrl(PROD))", "refused === 401", "!mute.length"]) assert.ok(verif.includes(step), step);
});
