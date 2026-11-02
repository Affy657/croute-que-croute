import { CANS, cachedCan, streak } from "./sky/cans.js";
import { cheese } from "./sky/cheese.js";
import { green, moons, purple, rock } from "./sky/classic.js";
import { egg } from "./sky/egg.js";
import { melies } from "./sky/melies.js";
import { bass, speakers } from "./sky/music.js";
import { pancake } from "./sky/pancake.js";
import { pirate } from "./sky/pirate.js";
import { pumpkin } from "./sky/pumpkin.js";
import { santa, stardust } from "./sky/santa.js";
import { toaster } from "./sky/toaster.js";
import { stage } from "./sky/tung.js";
import { roadster, saucer } from "./sky/vehicles.js";

export const BODIES = {
  normal: [{ draw: purple, r: 0.13, reach: 1.7 }, { draw: moons, r: 0.045, reach: 3.1 }, { draw: green, r: 0.1, reach: 1.7 }, { draw: rock, r: 0.05, reach: 1.1 }],
  wild: [
    { draw: pancake, name: "Planète pancake", r: 0.12, reach: 1.5 }, { draw: speakers, name: "Planète enceintes", r: 0.11, reach: 1.7 },
    { draw: bass, name: "Planète bleu canard", r: 0.11, reach: 1.8 }
  ],
  rare: [
    { draw: stage, name: "Tung Tung Tung Sahur", r: 0.05, reach: 3.9 }, { draw: cheese, name: "Lune en fromage", r: 0.1, reach: 1.5 },
    { draw: toaster, key: "toaster", name: "Grille-pain", r: 0.1, reach: 1.9 },
    { draw: pumpkin, key: "pumpkin", name: "Citrouille", r: 0.09, reach: 2.1 }, { draw: melies, name: "Lune de Méliès", r: 0.1, reach: 1.4 },
    { draw: pirate, key: "pirate", name: "Planète pirate", r: 0.07, reach: 2.25 }, { draw: egg, key: "egg", name: "Œuf de Pâques", r: 0.08, reach: 1.7 }
  ]
};

export const PASSERS = {
  ...Object.fromEntries(Object.keys(CANS).map((kind) => [kind, { name: CANS[kind].name, draw: (ctx, s) => cachedCan(ctx, kind, s), size: 0.13, trail: streak, spin: 1 }])),
  tesla: { name: "Tesla dans l'espace", draw: roadster, size: 0.17, spin: 0.35 },
  saucer: { name: "Soucoupe volante", draw: saucer, size: 0.15, flat: true },
  santa: { name: "Père Noël", draw: santa, size: 0.2, span: 1.5, trail: stardust, flat: true }
};
