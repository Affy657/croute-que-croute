import { test } from "node:test";
import assert from "node:assert/strict";

const { clientIp, readJson } = await import(new URL("../../src/http.ts", import.meta.url).href);

const MAX = 64 * 1024;
const ip = (value) => clientIp(new Request("http://local/", { headers: value ? { "cf-connecting-ip": value } : {} }));

test("IP : une IPv4 ne change pas", () => {
  assert.equal(ip("203.0.113.7"), "203.0.113.7");
});

test("IP : sans en-tête, « local »", () => {
  assert.equal(ip(null), "local");
});

test("IPv6 : deux appareils d'un même /64 comptent pour un", () => {
  assert.equal(ip("2001:db8:1:2:3:4:5:6"), ip("2001:db8:1:2:aaaa:bbbb:cccc:dddd"));
});

test("IPv6 : deux /64 voisins restent séparés", () => {
  assert.notEqual(ip("2001:db8:1:2::1"), ip("2001:db8:1:3::1"));
});

test("IPv6 : formes compressée, complète et en majuscules donnent le même réseau", () => {
  const same = ["2001:db8:1:2::1", "2001:0db8:0001:0002:0000:0000:0000:0001", "2001:DB8:1:2:0:0:0:1", "2001:db8:1:2::"];
  assert.deepEqual([...new Set(same.map(ip))], ["2001:db8:1:2::/64"]);
});

test("IPv6 : le « :: » peut cacher une partie du réseau", () => {
  assert.equal(ip("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(ip("2001:db8:1::"), "2001:db8:1:0::/64");
  assert.equal(ip("1:2:3:4:5:6:7::"), "1:2:3:4::/64");
});

test("IPv6 : adresses réduites au « :: »", () => {
  assert.equal(ip("::1"), "0:0:0:0::/64");
  assert.equal(ip("::"), "0:0:0:0::/64");
});

test("IPv6 : une IPv4 écrite en IPv6 reste cette IPv4, pas un réseau commun à tous", () => {
  assert.equal(ip("::ffff:203.0.113.7"), "203.0.113.7");
});

test("IPv6 : une valeur fantaisiste ne plante pas", () => {
  assert.equal(ip("1:2:3:4:5:6:7:8:9::1"), "1:2:3:4::/64");
});

function stream(chunks) {
  return new ReadableStream({
    pull(controller) {
      const next = chunks.shift();
      if (next) controller.enqueue(next);
      else controller.close();
    },
  });
}

const streamed = (chunks, headers = {}) => new Request("http://local/", { method: "POST", headers, body: stream(chunks), duplex: "half" });
const posted = (text) => new Request("http://local/", { method: "POST", body: text });
const encode = (text) => new TextEncoder().encode(text);
const sized = (n) => JSON.stringify({ a: "x".repeat(n - 8) });

test("corps JSON : exactement 64 Ko, lu", async () => {
  const text = sized(MAX);
  assert.equal(text.length, MAX);
  assert.equal((await readJson(posted(text))).a.length, MAX - 8);
});

test("corps JSON : un octet de trop, traité comme un JSON invalide", async () => {
  assert.deepEqual(await readJson(posted(sized(MAX + 1))), {});
});

test("corps JSON : envoyé par morceaux sans content-length, coupé à la lecture", async () => {
  const chunk = encode("x".repeat(40 * 1024));
  let pulled = 0;
  const body = new ReadableStream({
    pull(controller) {
      pulled++;
      controller.enqueue(chunk);
    },
  });
  const req = new Request("http://local/", { method: "POST", body, duplex: "half" });
  assert.equal(req.headers.get("content-length"), null);
  assert.deepEqual(await readJson(req), {});
  assert.ok(pulled <= 4, "lecture arrêtée au dépassement");
});

test("corps JSON : content-length menteur, plus petit que le corps, sans effet", async () => {
  assert.deepEqual(await readJson(streamed([encode('{"a":"'), encode("x".repeat(MAX)), encode('"}')], { "content-length": "10" })), {});
});

test("corps JSON : content-length trop grand, refusé sans lire", async () => {
  const req = streamed([encode('{"a":1}')], { "content-length": String(MAX + 1) });
  assert.deepEqual(await readJson(req), {});
});

test("corps JSON : une lettre accentuée coupée entre deux morceaux reste entière", async () => {
  const bytes = encode('{"a":"é"}');
  assert.deepEqual(await readJson(streamed([bytes.slice(0, 7), bytes.slice(7)])), { a: "é" });
});

test("corps JSON : vide, invalide ou valeur simple donnent {}", async () => {
  assert.deepEqual(await readJson(new Request("http://local/", { method: "POST" })), {});
  assert.deepEqual(await readJson(posted("{pas du json")), {});
  assert.deepEqual(await readJson(posted("12")), {});
});

test("progression la plus lourde possible (100 succès, 100 attaques, 100 garnitures) : bien en dessous de 64 Ko", async () => {
  const id = (i) => "a".repeat(21) + String(i).padStart(3, "0");
  const ids = Array.from({ length: 100 }, (_, i) => id(i));
  const look = { head: "crown", side: "bat", bread: "toasted", aura: "ring", spread: "choco", ach: 99, own: { head: 99, side: 99, bread: 99, aura: 99, spread: 99 }, at: 99999999999999 };
  const text = JSON.stringify({ look, progress: { got: Object.fromEntries(ids.map((i) => [i, 99999999999999])), attacks: ids, toppings: ids } });
  assert.ok(text.length < MAX / 4, text.length + " octets");
  assert.equal(Object.keys((await readJson(posted(text))).progress.got).length, 100);
});
