import { createSim, speedMul, FW, FH, STEP } from "./sim.js";

const SENS = 1.15;
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const $ = (id) => document.getElementById(id);
const ui = {
  menu: $("menu"), over: $("over"), board: $("board"), hud: $("hud"), time: $("time"), hudBest: $("hudBest"),
  menuInfo: $("menuInfo"), joinForm: $("joinForm"), pseudo: $("pseudo"), joinError: $("joinError"),
  menuActions: $("menuActions"), play: $("play"), menuBoard: $("menuBoard"), menuCountdown: $("menuCountdown"),
  final: $("final"), newBest: $("newBest"), overBest: $("overBest"), overRank: $("overRank"),
  again: $("again"), overBoard: $("overBoard"), overCountdown: $("overCountdown"),
  boardEvent: $("boardEvent"), boardCountdown: $("boardCountdown"), boardList: $("boardList"),
  boardEmpty: $("boardEmpty"), boardBack: $("boardBack")
};
const css = getComputedStyle(document.documentElement);
const C = {};
for (const k of ["void", "field", "frame", "planet", "planet-shade", "mustard", "flame", "jam", "crust", "crumb", "butter", "steel", "steel-dark", "handle", "ink"]) {
  C[k] = css.getPropertyValue("--" + k).trim();
}
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtCs = (cs) => (cs / 100).toFixed(2).replace(".", ",");
const ord = (n) => (n === 1 ? "1er" : n + "e");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
};

const net = { token: store.get("cv-token"), board: null, offset: 0, online: true };
let localBest = parseInt(store.get("cv-best-cs") || "0", 10) || 0;

let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0, stars = [], planetY = 0;
let drag = null, mouse = null, lastShown = "", runPromise = null;
let boardOpen = false, boardFrom = "menu", boardTimer = null, wasOpen = null;
const pend = { x: 0, y: 0 };
let sim = createSim();
const S = {
  mode: "menu", clock: 0, shake: 0, dieT: 0, freeze: 0, splat: null,
  newBest: false, score: 0, submit: null,
  toast: { x: FW / 2, y: FH * 0.55, tilt: 0, thrust: 0.35 },
  parts: [], pops: []
};

async function call(method, path, body) {
  const headers = { "content-type": "application/json" };
  if (net.token) headers.authorization = "Bearer " + net.token;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || "Erreur réseau.");
    err.status = res.status;
    throw err;
  }
  return data;
}

const serverNow = () => Date.now() + net.offset;
const hasEvent = () => !!(net.board && net.board.event);
const registered = () => !!(net.board && net.board.me);
const isOpen = () => hasEvent() && serverNow() < net.board.event.closesAt;
const canCompete = () => registered() && isOpen();
const knownBest = () => (registered() ? net.board.me.best : localBest);

async function refreshBoard() {
  try {
    const b = await call("GET", "/api/board");
    net.offset = b.now - Date.now();
    net.online = true;
    if (net.token && b.event && !b.me) {
      net.token = null;
      store.set("cv-token", null);
    }
    net.board = b;
  } catch (e) {
    net.online = false;
  }
  renderAll();
}

async function submitScore(score, pending) {
  const run = await pending;
  if (run.error) return run;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await call("POST", "/api/runs/" + run.runId, { score });
      if (net.board && net.board.me) {
        net.board.me.best = r.best;
        net.board.me.rank = r.rank;
        net.board.count = r.count;
      }
      refreshBoard();
      return r;
    } catch (e) {
      if (e.status) return { error: e.message };
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  }
  return { error: "Score non envoyé : pas de réseau." };
}

function setText(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

function duration(ms) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return h + " h " + String(m).padStart(2, "0") + " min";
  if (m > 0) return m + " min " + String(sec).padStart(2, "0") + " s";
  return sec + " s";
}

function setCountdown(el) {
  if (!hasEvent()) {
    el.hidden = true;
    return;
  }
  const closesAt = net.board.event.closesAt;
  const hour = new Date(closesAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  const left = closesAt - serverNow();
  el.hidden = false;
  if (left <= 0) {
    el.replaceChildren("Classement fermé à " + hour);
    return;
  }
  const strong = document.createElement("b");
  strong.textContent = duration(left);
  el.replaceChildren("Fin du classement dans ", strong, " (" + hour + ")");
}

function renderMenu() {
  const b = net.board;
  const needJoin = isOpen() && !registered();
  ui.joinForm.hidden = !needJoin;
  ui.menuActions.hidden = needJoin;
  ui.menuBoard.hidden = !hasEvent();
  let info = "";
  if (!b) info = net.online ? "" : "Pas de réseau : tu peux jouer, mais ton score ne sera pas compté.";
  else if (!b.event) info = "Pas de classement en cours. Tu peux t'entraîner.";
  else if (!isOpen()) {
    const w = b.top[0];
    info = w ? "Classement fermé. Bravo " + w.pseudo + " avec " + fmtCs(w.best) + " s !" : "Classement fermé.";
  } else if (b.me) {
    info = b.me.best
      ? "Salut " + b.me.pseudo + ", ton meilleur : " + fmtCs(b.me.best) + " s" + (b.me.rank ? ", " + ord(b.me.rank) + " sur " + b.count : "")
      : "Salut " + b.me.pseudo + ", à toi de jouer.";
  }
  setText(ui.menuInfo, info);
  setCountdown(ui.menuCountdown);
}

function boardRow(rank, pseudo, best, me) {
  const li = document.createElement("li");
  if (me) li.className = "me";
  for (const [cls, text] of [["pos", String(rank)], ["name", pseudo], ["val", fmtCs(best) + " s"]]) {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    li.append(span);
  }
  return li;
}

function renderBoard() {
  const b = net.board;
  ui.boardEvent.textContent = b && b.event ? b.event.name : "";
  setCountdown(ui.boardCountdown);
  const top = b ? b.top : [];
  const rows = top.map((r) => boardRow(r.rank, r.pseudo, r.best, r.me));
  if (b && b.me && b.me.rank && !top.some((r) => r.me)) {
    const gap = document.createElement("li");
    gap.className = "gap";
    gap.textContent = "…";
    rows.push(gap, boardRow(b.me.rank, b.me.pseudo, b.me.best, true));
  }
  ui.boardList.replaceChildren(...rows);
  ui.boardList.hidden = rows.length === 0;
  setText(ui.boardEmpty, rows.length ? "" : b ? "Personne n'a encore de score. À toi l'honneur." : "Pas de réseau pour l'instant.");
}

function renderAll() {
  if (!ui.menu.hidden) renderMenu();
  if (!ui.board.hidden) renderBoard();
  if (!ui.over.hidden) {
    ui.overBoard.hidden = !hasEvent();
    setCountdown(ui.overCountdown);
  }
}

function openBoard(from) {
  boardOpen = true;
  boardFrom = from;
  ui.menu.hidden = true;
  ui.over.hidden = true;
  ui.board.hidden = false;
  renderBoard();
  refreshBoard();
  clearInterval(boardTimer);
  boardTimer = setInterval(refreshBoard, 10000);
}

function closeBoard() {
  clearInterval(boardTimer);
  boardOpen = false;
  ui.board.hidden = true;
  if (boardFrom === "over") {
    ui.over.hidden = false;
    renderAll();
  } else {
    showMenu();
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  scale = Math.min(W / FW, H / FH);
  ox = (W - FW * scale) / 2;
  oy = (H - FH * scale) / 2;
  const n = Math.round((W * H) / 2600);
  stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: rnd(0.1, 1), tw: rnd(0, 6.28) }));
}

const planetR = () => Math.min(W, H) * 0.13;

function rr(x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function die() {
  const tt = S.toast;
  S.mode = "dying";
  S.dieT = 0;
  S.freeze = 0.12;
  S.shake = reduceMotion ? 0 : 12;
  drag = null;
  tt.thrust = 0;
  for (let i = 0; i < 30; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(60, 280);
    S.parts.push({ x: tt.x, y: tt.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: rnd(2.5, 7), life: rnd(0.6, 1.1), c: Math.random() < 0.7 ? C.jam : C.crumb });
  }
  S.splat = Array.from({ length: 7 }, () => ({ dx: rnd(-13, 13), dy: rnd(-11, 13), r: rnd(4.5, 10) }));
  S.score = Math.floor(sim.state.t * 100);
  S.newBest = S.score > knownBest();
  if (!registered() && S.newBest) {
    localBest = S.score;
    store.set("cv-best-cs", String(localBest));
  }
  S.submit = runPromise ? submitScore(S.score, runPromise) : null;
  runPromise = null;
  try { if (navigator.vibrate) navigator.vibrate(140); } catch (e) {}
}

function update(dt) {
  S.clock += dt;
  const warp = S.mode === "play" ? 1 + (speedMul(sim.state.t) - 1) * 1.6 : 0.5;
  for (const s of stars) {
    s.y += (18 + 150 * s.z) * warp * dt;
    if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
  }
  planetY += 7 * warp * dt;
  if (planetY - planetR() * 1.7 > H) planetY = -planetR() * 1.7;
  if (S.shake > 0) S.shake = Math.max(0, S.shake - 60 * dt);
  for (const p of S.parts) {
    p.vy += 420 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  S.parts = S.parts.filter((p) => p.life > 0);
  for (const p of S.pops) {
    p.y -= 34 * dt;
    p.life -= dt;
  }
  S.pops = S.pops.filter((p) => p.life > 0);

  const tt = S.toast;
  if (S.mode === "menu") {
    tt.x = FW / 2;
    tt.y = FH * 0.55 + Math.sin(S.clock * 2.2) * 7;
    tt.tilt = Math.sin(S.clock * 1.3) * 0.08;
    tt.thrust = 0.35;
    return;
  }
  if (S.mode !== "play") {
    if (S.freeze > 0) { S.freeze -= dt; return; }
    sim.drift(dt);
    if (S.mode === "dying") {
      S.dieT += dt;
      if (S.dieT > 0.75) showOver();
    }
    return;
  }

  const px = sim.state.toast.x, py = sim.state.toast.y;
  const events = sim.step(dt, pend.x, pend.y);
  pend.x = 0;
  pend.y = 0;
  const st = sim.state.toast;
  const vx = (st.x - px) / dt, vy = (st.y - py) / dt;
  tt.x = st.x;
  tt.y = st.y;
  tt.tilt += (clamp(vx / 900, -0.45, 0.45) - tt.tilt) * Math.min(1, dt * 14);
  tt.thrust += (clamp(Math.hypot(vx, vy) / 600, 0, 1) - tt.thrust) * Math.min(1, dt * 10);
  for (const e of events) {
    if (e.type === "near") S.pops.push({ x: tt.x, y: tt.y - 32, text: "Frôlé !", life: 0.7 });
    if (e.type === "death") die();
  }
}

function drawPlanet() {
  const r = planetR(), x = W * 0.8, y = planetY;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.strokeStyle = C.mustard;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.42, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, C.planet);
  g.addColorStop(1, C["planet-shade"]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.42, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawWarn(w) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.a);
  ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(S.clock * 18));
  ctx.fillStyle = C.flame;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKnife(o) {
  const L = o.len, hx = -L / 2, bx = hx + 22;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.a);
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.handle;
  ctx.beginPath();
  rr(hx, -4.5, 23, 9, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(bx, -5);
  ctx.lineTo(L / 2 - 9, -5);
  ctx.quadraticCurveTo(L / 2 + 2, -4, L / 2, 1.5);
  ctx.quadraticCurveTo(L / 2 - 16, 6, bx, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.butter;
  ctx.beginPath();
  ctx.ellipse(L / 2 - 15, 1.5, 7, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C["steel-dark"];
  for (const rx of [hx + 7, hx + 15]) {
    ctx.beginPath();
    ctx.arc(rx, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFork(o) {
  const L = o.len, hx = -L / 2, nx = hx + 30, tx = L / 2 - 20;
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.a);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const y = -6 + i * 4;
    ctx.lineWidth = 4;
    ctx.strokeStyle = C.void;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(L / 2, y);
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const y = -6 + i * 4;
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.steel;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(L / 2 - 1, y);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(nx, -3);
  ctx.lineTo(tx, -7.5);
  ctx.lineTo(tx, 7.5);
  ctx.lineTo(nx, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  rr(hx, -3.5, 31, 7, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function toastPath(w, h) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 6, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 6);
  ctx.lineTo(-w / 2, -h * 0.12);
  ctx.bezierCurveTo(-w * 0.66, -h * 0.62, -w * 0.06, -h * 0.7, 0, -h * 0.46);
  ctx.bezierCurveTo(w * 0.06, -h * 0.7, w * 0.66, -h * 0.62, w / 2, -h * 0.12);
  ctx.lineTo(w / 2, h / 2 - 6);
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 6, h / 2);
  ctx.closePath();
}

function drawToast() {
  const t = S.toast, w = 40, h = 42;
  const dead = S.mode === "dying" || S.mode === "over";
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(dead ? 0.5 : t.tilt);
  ctx.lineJoin = "round";
  if (!dead) {
    for (const side of [-1, 1]) {
      const bx = side * w * 0.3, by = h / 2;
      const fl = 9 + t.thrust * 12 + Math.random() * 6;
      const g = ctx.createLinearGradient(0, by + 5, 0, by + 5 + fl);
      g.addColorStop(0, C.mustard);
      g.addColorStop(1, C.flame);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx - 4.5, by + 5);
      ctx.lineTo(bx + 4.5, by + 5);
      ctx.lineTo(bx, by + 5 + fl);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.steel;
      ctx.strokeStyle = C.void;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      rr(bx - 5, by - 8, 10, 14, 3);
      ctx.fill();
      ctx.stroke();
    }
  }
  toastPath(w, h);
  ctx.fillStyle = C.crust;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = C.void;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(w, h);
  ctx.fillStyle = C.crumb;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.crust;
  ctx.globalAlpha = 0.45;
  for (const [px, py] of [[-10, -7], [9, -9], [-9, 10], [10, 9], [1, -12]]) {
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(-1, 3);
  ctx.rotate(0.18);
  ctx.fillStyle = C.butter;
  ctx.beginPath();
  rr(-7, -5.5, 14, 11, 3);
  ctx.fill();
  ctx.restore();
  if (dead && S.splat) {
    ctx.fillStyle = C.jam;
    for (const b of S.splat) {
      ctx.beginPath();
      ctx.arc(b.dx, b.dy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.void;
  ctx.fillRect(0, 0, W, H);
  drawPlanet();
  ctx.fillStyle = C.ink;
  for (const s of stars) {
    ctx.globalAlpha = (0.3 + 0.7 * s.z) * (0.7 + 0.3 * Math.sin(s.tw + S.clock * 3));
    const sz = 0.6 + s.z * 1.8;
    ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
  const sx = S.shake ? rnd(-S.shake, S.shake) : 0;
  const sy = S.shake ? rnd(-S.shake, S.shake) : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
  ctx.fillStyle = C.field;
  ctx.fillRect(0, 0, FW, FH);
  ctx.strokeStyle = C.frame;
  ctx.lineWidth = 2 / scale;
  ctx.strokeRect(0, 0, FW, FH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FW, FH);
  ctx.clip();
  for (const w of sim.state.warns) drawWarn(w);
  for (const o of sim.state.obs) {
    if (o.kind === "knife") drawKnife(o);
    else drawFork(o);
  }
  drawToast();
  for (const p of S.parts) {
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = '800 15px "Baloo 2", "Trebuchet MS", sans-serif';
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3.5;
  for (const p of S.pops) {
    ctx.globalAlpha = clamp(p.life / 0.7, 0, 1);
    ctx.strokeStyle = C.void;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = C.mustard;
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function showMenu() {
  S.mode = "menu";
  ui.menu.hidden = false;
  ui.over.hidden = true;
  ui.board.hidden = true;
  ui.hud.hidden = true;
  renderMenu();
}

function start() {
  if (boardOpen || !ui.joinForm.hidden) return false;
  if (S.mode !== "menu" && S.mode !== "over") return false;
  if (S.mode === "over" && ui.again.disabled) return false;
  sim = createSim();
  Object.assign(S, { mode: "play", shake: 0, dieT: 0, freeze: 0, splat: null, newBest: false, score: 0, submit: null, parts: [], pops: [] });
  Object.assign(S.toast, { x: sim.state.toast.x, y: sim.state.toast.y, tilt: 0, thrust: 0 });
  runPromise = canCompete()
    ? call("POST", "/api/runs").catch((e) => ({ error: e.status ? e.message : "Score non compté : pas de réseau au début de la partie." }))
    : null;
  pend.x = 0;
  pend.y = 0;
  drag = null;
  lastShown = "";
  ui.menu.hidden = true;
  ui.over.hidden = true;
  ui.hud.hidden = false;
  ui.time.textContent = "0,00";
  ui.hudBest.textContent = knownBest() ? "Record " + fmtCs(knownBest()) + " s" : "";
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  return true;
}

function showOver() {
  S.mode = "over";
  ui.hud.hidden = true;
  ui.over.hidden = false;
  ui.final.textContent = fmtCs(S.score);
  ui.newBest.hidden = !S.newBest;
  setText(ui.overBest, !S.newBest && knownBest() ? "Ton meilleur : " + fmtCs(knownBest()) + " s" : "");
  ui.overBoard.hidden = !hasEvent();
  setCountdown(ui.overCountdown);
  const mine = S.submit;
  if (mine) {
    setText(ui.overRank, "Envoi du score…");
    mine.then((r) => {
      if (S.submit !== mine || S.mode !== "over") return;
      setText(ui.overRank, r.error ? r.error : r.rank ? "Tu es " + ord(r.rank) + " sur " + r.count : "");
    });
  } else {
    setText(ui.overRank, hasEvent() && !isOpen() ? "Classement fermé : partie d'entraînement." : "");
  }
  ui.again.disabled = true;
  setTimeout(() => { ui.again.disabled = false; }, 450);
}

function beginDrag(e) {
  drag = { id: e.pointerId, lx: e.clientX, ly: e.clientY };
}

cv.addEventListener("pointerdown", (e) => {
  if (S.mode === "play" && !drag) {
    beginDrag(e);
    e.preventDefault();
  }
});

window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse" && !drag) {
    if (S.mode === "play" && mouse) {
      pend.x += ((e.clientX - mouse.x) / scale) * SENS;
      pend.y += ((e.clientY - mouse.y) / scale) * SENS;
    }
    mouse = { x: e.clientX, y: e.clientY };
    return;
  }
  if (!drag || e.pointerId !== drag.id || S.mode !== "play") return;
  pend.x += ((e.clientX - drag.lx) / scale) * SENS;
  pend.y += ((e.clientY - drag.ly) / scale) * SENS;
  drag.lx = e.clientX;
  drag.ly = e.clientY;
  if (e.pointerType === "mouse") mouse = { x: e.clientX, y: e.clientY };
});

const endDrag = (e) => {
  if (drag && e.pointerId === drag.id) drag = null;
};
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);
document.addEventListener("touchmove", (e) => {
  if (!(e.target instanceof Element && e.target.closest(".board-list"))) e.preventDefault();
}, { passive: false });

const go = (e) => {
  if (start()) {
    beginDrag(e);
    e.preventDefault();
  }
};
ui.play.addEventListener("pointerdown", go);
ui.again.addEventListener("pointerdown", go);
ui.play.addEventListener("click", () => start());
ui.again.addEventListener("click", () => start());
ui.menuBoard.addEventListener("click", () => openBoard("menu"));
ui.overBoard.addEventListener("click", () => openBoard("over"));
ui.boardBack.addEventListener("click", closeBoard);

ui.joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = ui.joinForm.querySelector("button");
  setText(ui.joinError, "");
  button.disabled = true;
  try {
    const r = await call("POST", "/api/join", { pseudo: ui.pseudo.value });
    net.token = r.token;
    store.set("cv-token", r.token);
    ui.pseudo.blur();
    await refreshBoard();
  } catch (err) {
    setText(ui.joinError, err.status ? err.message : "Pas de réseau, réessaie.");
  } finally {
    button.disabled = false;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof Element && e.target.closest("input")) return;
  if (e.code !== "Space" && e.code !== "Enter") return;
  if (S.mode === "menu" || S.mode === "over") {
    e.preventDefault();
    start();
  }
});

window.addEventListener("resize", resize);

setInterval(() => {
  const open = isOpen();
  if (wasOpen !== null && open !== wasOpen) renderAll();
  wasOpen = open;
  if (!ui.menu.hidden) setCountdown(ui.menuCountdown);
  if (!ui.over.hidden) setCountdown(ui.overCountdown);
  if (!ui.board.hidden) setCountdown(ui.boardCountdown);
}, 1000);

setInterval(() => {
  if (S.mode === "menu" && !boardOpen) refreshBoard();
}, 30000);

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render();
  if (S.mode === "play" || S.mode === "dying") {
    const s = fmtCs(Math.floor(sim.state.t * 100));
    if (s !== lastShown) {
      ui.time.textContent = s;
      lastShown = s;
    }
  }
  requestAnimationFrame(frame);
}

{
  const warm = createSim();
  for (let i = 0; i < 720; i++) warm.step(STEP, 0, 0);
}

resize();
planetY = H * 0.22;
showMenu();
refreshBoard();
requestAnimationFrame(frame);
