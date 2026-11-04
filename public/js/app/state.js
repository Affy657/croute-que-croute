import { createSim } from "../game/sim.js";
import { FW, FH } from "../game/field.js";
import { VERSION } from "../version.js";
import * as api from "./api.js";
import { createScene } from "./scene.js";
import { createInput } from "./input.js";
import { chosen } from "./toppings.js";
import { outfit } from "./gear.js";
import { ui } from "./screens.js";

document.documentElement.dataset.version = VERSION;
if (Object.values(ui).some((el) => !el)) api.applyUpdate();
const canvas = document.getElementById("cv");
export const scene = createScene(canvas, document.getElementById("fx"));
export const game = { sim: createSim() };
/** @type {Play} */
export const S = /** @type {never} */ ({
  mode: "menu", clock: 0, dieT: 0, freeze: 0, splat: null, chain: 0, combo: 0, nearAt: -Infinity, train: null, t0: 0,
  newBest: false, score: 0, submit: null, run: null, prevRank: null, scope: "general", guess: false, late: false, held: false,
  toast: { x: FW / 2, y: FH * 0.55, tilt: 0, thrust: 0.35, scars: [], spread: chosen(), ...outfit() }, gotToppings: [], menuY: FH * 0.55, menuAt: 0
});

export const playing = () => S.mode === "play" || S.mode === "dying";
export const elapsed = () => game.sim.state.t - S.t0;
export const replay = () => (S.mode === "over" ? S.train : null);
export const input = createInput(canvas, { active: () => S.mode === "play", scale: () => scene.view.scale, view: () => scene.view, toast: () => game.sim.state.toast });
