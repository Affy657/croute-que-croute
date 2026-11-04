interface Document {
  getElementById(id: string): any;
}

interface ParentNode {
  querySelector(selectors: string): any;
  querySelectorAll(selectors: string): NodeListOf<any>;
}

interface Element {
  closest(selectors: string): any;
}

interface Array<T> {
  includes(searchElement: unknown, fromIndex?: number): boolean;
}

interface HTMLCanvasElement {
  dpr: number;
}

interface Navigator {
  standalone?: boolean;
  audioSession?: { type: string };
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface WindowEventMap {
  beforeinstallprompt: InstallPrompt;
}

interface InstallPrompt extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: string }>;
}

declare function clearTimeout(id: number | null | undefined): void;
declare function clearInterval(id: number | null | undefined): void;

type Loaded = HTMLElement & { currentSrc?: string; src?: string; href?: string };
type Tap = MouseEvent & { target: Element };
type KeyHit = KeyboardEvent & { target: Element };
type Err = Error & { status?: number; data: { merge?: { from: string; into: string } } };
type Row = HTMLElement & { dataset: { id: string; pseudo: string } };
type Ticker = HTMLElement & { timer?: HTMLElement };
type Flash = HTMLButtonElement & { flash?: number; label?: string };
type MakeCell = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text: string) => HTMLElementTagNameMap[K];
type MakeEl = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, text?: string) => HTMLElementTagNameMap[K];

type Ctx = CanvasRenderingContext2D;
type Palettes = typeof import("./public/js/shared/palette.js");
type Pal = Palettes["PALETTE"];
type Sky = Palettes["SKY"];
type Art = (ctx: Ctx, r: number) => void;
type Move = (ctx: Ctx, r: number, clock: number) => void;
type Box = (ctx: Ctx, w: number, h: number) => void;
type Tint = (ctx: Ctx, C: Pal) => void;
type Pts = number[][];
type Pair = [number, number];
type Rng = () => number;
type Rnd = (a: number, b: number) => number;
type PickOne = <T>(list: T[]) => T;
type Step = [number, string];
type Steps = Step[];
type Toaster = (ctx: Ctx, t: Toast, C: Pal) => void;
type Fn = () => void;
type Timer = number | null;

interface Pt {
  x: number;
  y: number;
}

type Capsule = [number, number, number, number, number];

interface Weapon {
  name: string;
  by: string;
  len: number;
  rad: number;
  lab?: boolean;
  across?: boolean;
  parts: Capsule[];
  reach: number;
  spinReach: number;
}

interface Shot extends Pt {
  kind: string;
  vx: number;
  vy: number;
  a: number;
  spin: number;
  len: number;
  rad: number;
  near: boolean;
  spread: string | null;
  bounces: number;
  from?: string;
  seen?: boolean;
}

interface Warn extends Pt {
  a: number;
  at: number;
  obs: Shot[];
  notice?: number;
  born?: number;
}

interface LiveWarn extends Warn {
  born: number;
}

interface Spawn {
  t: number;
  toast: Pt;
  rng: Rng;
  rnd: Rnd;
  pick: PickOne;
  last?: string | null;
}

interface Attack {
  id: string;
  name: string;
  from: number;
  weight: number;
  cost: number;
  speed: number;
  make(g: Spawn): Warn[];
  info: string;
  lab?: boolean;
  solo?: boolean;
  calm?: boolean;
  kin?: string;
  shuns?: string[];
  holds?: string[];
  waits?: string[];
  avoids?: string[];
  growsUntil?: number;
  growth?: string;
}

interface SimStats {
  spawned: number;
  rejected: number;
  impossible: number;
  own: Record<string, number>;
  solves: number;
  solveMs: number;
  solveMax: number;
}

interface SimState {
  t: number;
  next: number;
  tries: number;
  near: number;
  dead: boolean;
  last: string | null;
  streak: number;
  queued: Attack | null;
  held: Attack | null;
  until: Record<string, number>;
  toast: Pt;
  obs: Shot[];
  warns: LiveWarn[];
  stats: SimStats;
}

interface Sim {
  state: SimState;
  step(dt: number, mx: number, my: number): SimEvent[];
  drift(dt: number): void;
}

interface SimOptions {
  fair?: boolean;
  react?: number;
  only?: string | null;
  t0?: number;
  y?: number;
  immortal?: () => boolean;
  audit?: boolean;
}

interface Killer {
  type: "death";
  by?: string;
  kind: string;
  spread: string | null;
}

interface Graze extends Pt {
  type: "near";
  spread: string | null;
}

type SimEvent = Killer | Graze;

interface Mover extends Pt {
  vx: number;
  vy: number;
  a: number;
  cos: number;
  sin: number;
  h: number;
  r: number;
  along: boolean;
  ahead: number;
  t0: number;
  t1: number;
}

interface Area {
  i0: number;
  i1: number;
  j0: number;
  j1: number;
}

type RowWrite = (j: number, i0: number, i1: number) => void;

interface Spread {
  name: string;
  free?: boolean;
  with?: string;
  color: string;
  shine: string;
  bits?: boolean;
  drip?: boolean;
}

interface GearItem {
  slot: string;
  name: string;
  crust?: string;
  crumb?: string;
}

interface Worn {
  head?: string | null;
  side?: string | null;
  bread?: string | null;
  aura?: string | null;
}

interface Look extends Worn {
  spread: string;
  ach: number;
  own: Record<string, number>;
  at: number;
}

type ShotArt = Pick<Shot, "kind" | "x" | "y" | "a" | "len" | "rad" | "spread">;
type ShotDraw = (ctx: Ctx, o: ShotArt, C: Pal) => void;

interface AuraArt {
  back(ctx: Ctx, now: number, C: Pal, round: boolean): void;
  front?(ctx: Ctx, now: number, C: Pal): void;
}

interface Scar {
  a: number;
  len: number;
}

interface Toast extends Pt, Worn {
  tilt: number;
  thrust: number;
  scars?: Scar[];
  spread?: string;
}

interface Splash {
  dx: number;
  dy: number;
  r: number;
}

interface Zone {
  x0: number;
  x1: number;
  y1: number;
}

interface Planet {
  draw: Move;
  r: number;
  reach: number;
  name?: string;
  key?: string;
}

interface Passer {
  name: string;
  draw: Move;
  size: number;
  trail?: Move;
  spin?: number;
  flat?: boolean;
  span?: number;
}

interface SkyArt {
  cv: HTMLCanvasElement;
  g: Ctx;
  size: number;
  body: Planet | null;
  r: number;
  at: number;
}

interface Star extends Pt {
  z: number;
  tw: number;
}

interface Crumb extends Pt {
  vx: number;
  vy: number;
  r: number;
  life: number;
  c: string;
}

interface Pop extends Pt {
  text: string;
  key: string | null;
  size: number;
  life: number;
}

interface PopOptions {
  key?: string | null;
  size?: number;
}

interface Comet {
  k: number;
  kind: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  a0: number;
  spin: number;
}

interface View {
  W: number;
  H: number;
  dpr: number;
  scale: number;
  ox: number;
  oy: number;
}

interface HudBox {
  left: number;
  right: number;
  bottom: number;
}

interface Finger extends Pt {
  held: boolean;
  touch: boolean;
  at: number;
}

interface Frame {
  clock: number;
  world: SimState;
  toast: Toast | null;
  splat: Splash[] | null;
  finger: Finger | null;
  dying: boolean;
}

interface Rival {
  pseudo: string;
  best: number;
}

interface Ranked {
  rank: number;
  id: string;
  pseudo: string;
  best: number;
  at: number;
  me: boolean;
}

interface EventInfo {
  name: string;
  opensAt: number;
  closesAt: number;
  finalAt: number;
  status: string;
}

interface Slate {
  now: number;
  version: string;
  event: EventInfo | null;
  next: EventInfo | null;
}

interface Me {
  id: string;
  pseudo: string;
  best: number;
  runs: number;
  rank: number | null;
  rival: Rival | null;
  pcBest: number;
  pcRank: number | null;
  pcRival: Rival | null;
  eventBest: number;
  eventRank: number | null;
  eventRival: Rival | null;
  banned: boolean;
  look: Look | null;
  google: boolean;
}

interface Board extends Slate {
  google: boolean;
  top: Ranked[];
  count: number;
  pcTop: Ranked[];
  pcCount: number;
  eventTop: Ranked[];
  eventCount: number;
  me: Me | null;
}

type Joined = Board & { me: Me };

interface FeedItem {
  kind: string;
  pseudo: string;
  score?: number;
  at: number;
}

interface ScreenBoard extends Slate {
  stamp: string;
  same?: boolean;
  last: number;
  top: Ranked[];
  count: number;
  feed: FeedItem[];
}

interface ClientError {
  kind: string;
  message: string;
  source: string;
  stack: string;
  trail: string[];
  device: string;
  count: number;
  sent: number;
}

interface Store {
  get(k: string): string | null;
  set(k: string, v?: string | number | null): void;
}

interface Bests {
  best: number;
  pcBest: number;
}

interface Standing {
  best: number;
  rank: number | null;
  count: number;
  rival?: Rival | null;
}

interface Pending {
  runId: string;
  score: number;
  device: string;
  combo: number;
  at: number;
}

interface RunFail {
  error: string;
  status?: number;
}

interface RunTicket {
  runId: string;
  error?: undefined;
}

interface RunResult {
  best: number;
  improved: boolean;
  rank: number | null;
  rival: Rival | null;
  count: number;
  pcBest: number;
  pcImproved: boolean;
  pcRank: number | null;
  pcRival: Rival | null;
  pcCount: number;
  eventBest: number | null;
  eventImproved: boolean;
  eventRank: number | null;
  eventRival: Rival | null;
  eventCount: number;
}

type RunAnswer = Partial<RunResult> & Partial<RunFail>;
type Listener = (value?: RunAnswer) => void;

interface Net {
  token: string | null;
  board: Board | null;
  offset: number;
  online: boolean;
  updatePending: boolean;
}

interface CardRecord {
  score: number;
  pc: boolean;
  at: number;
}

interface PlayerCard {
  now: number;
  pseudo: string;
  joinedAt: number;
  lastAt: number | null;
  best: number;
  rank: number | null;
  count: number;
  pcBest: number;
  pcRank: number | null;
  pcCount: number;
  runs: number;
  played: number;
  records: CardRecord[];
  combo: number;
  events: number;
  eventBest: { name: string; place: number } | null;
  look: Look | null;
  feats: Record<string, boolean>;
}

interface SyncData {
  got?: Record<string, number>;
  attacks?: string[];
  toppings?: string[];
}

interface Feat {
  id: string;
  family: string;
  name: string;
  desc: string;
  gear?: string;
  hint?: string;
}

interface FeatData {
  got: Record<string, number>;
  attacks: string[];
  events: string[];
  killers: string[];
  runs: number;
  best: number;
  seen?: number;
}

type FeatChange = (d: FeatData) => boolean | void;
type Goal = [number, number, string?];

interface Play {
  mode: string;
  clock: number;
  dieT: number;
  freeze: number;
  splat: Splash[] | null;
  chain: number;
  combo: number;
  nearAt: number;
  train: Attack | null;
  t0: number;
  newBest: boolean;
  score: number;
  submit: Promise<RunAnswer> | null;
  run: Promise<RunTicket | RunFail> | null;
  prevRank: number | null;
  scope: string;
  guess: boolean;
  late: boolean;
  held: boolean;
  toast: Toast & { scars: Scar[] };
  gotToppings: string[];
  menuY: number;
  menuAt: number;
  killer: Killer;
  lap: number;
  goal: { best: number; lead: number; reached: number };
}

type GearListener = (slot: string, kind: string | null) => void;
type SpreadListener = (kind: string, synced?: boolean) => void;
type FeatListener = (a: Feat, synced?: boolean) => void;

interface InputHooks {
  active(): boolean;
  scale(): number;
  view(): View;
  toast(): Pt;
}

interface Spark extends Pt {
  vx: number;
  vy: number;
  g: number;
  drag: number;
  life: number;
  c: string;
  star: boolean;
  w: number;
  h: number;
  a: number;
  va: number;
}

interface SparkOptions {
  colors: string[];
  g?: number;
  drag?: number;
  life: number;
}

interface BurstOptions {
  count?: number;
  power?: number;
  gold?: boolean;
}

type AudioParts = ReturnType<typeof import("./public/js/app/audio.js").audioParts>;

interface Notch {
  a: number;
  d: number;
  s: number;
  teeth?: number;
}

interface NotchArt extends Notch {
  br: number;
  cx: number;
  cy: number;
  phi: number;
  psi: number;
}

interface Can {
  name: string;
  edge: string;
  mid: string;
  lid: string;
  decor: Box;
}

interface Shown {
  title: string;
  first: Ranked | null;
  bests: Set<number>;
  last: number;
}

interface Song {
  buffer: AudioBuffer;
  loopStart: number;
  loopEnd: number;
}

interface Playing {
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  fade: GainNode;
  at: number;
  t: number;
  preview: boolean;
}

interface Preview {
  attack: Attack;
  card: HTMLDetailsElement;
  cv: HTMLCanvasElement;
  ctx: Ctx;
  pending: LiveWarn[];
  obs: Shot[];
  time: number;
  idle: number;
}

interface Qr {
  size: number;
  bits: string;
}

interface AdminEvent extends Omit<EventInfo, "finalAt"> {
  status: "open" | "upcoming" | "closed";
}

interface AdminPlayer {
  id: string;
  pseudo: string;
  best: number;
  banned: number;
  runs: number;
  suspect: "high" | "slow" | null;
  active: boolean;
}

interface AdminData {
  event: AdminEvent | null;
  players: AdminPlayer[];
  stats: { players: number; runs: number };
}

interface AdminRole {
  name: string;
  role: string;
}

interface TeamMate extends AdminRole {
  id: string;
  last_seen: number;
  me: boolean;
}

interface ErrorDevice {
  ua: string;
  platform: string;
  standalone: boolean;
}

interface ErrorSample extends ErrorDevice {
  stack: string;
  trail: string;
  device: string;
  page: string;
  version: string;
}

interface ErrorGroup {
  id: string;
  kind: string;
  message: string;
  source: string;
  count: number;
  sessions: number;
  firstAt: number;
  lastAt: number;
  versions: number;
  onCurrent: boolean;
  platforms: Record<string, number>;
  last: ErrorSample;
}

interface MergeSide {
  pseudo: string;
  best: number;
  runs: number;
}
