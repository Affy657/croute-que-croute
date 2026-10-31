export const PALETTE = {
  void: "#0d0b24",
  field: "rgba(31, 24, 78, 0.45)",
  frame: "rgba(255, 207, 51, 0.22)",
  planet: "#6a3fa3",
  "planet-shade": "#2a1a4f",
  mustard: "#ffcf33",
  flame: "#ff7a1a",
  jam: "#e0244a",
  crust: "#c0712f",
  crumb: "#f6c983",
  butter: "#fff1a8",
  steel: "#d5dbe8",
  "steel-dark": "#7d8499",
  handle: "#4a2c1d",
  ink: "#fff6e0",
  wood: "#d9a066",
  "wood-dark": "#a86b3c",
  trail: "rgba(255, 246, 224, 0.6)",
  "trail-end": "rgba(255, 246, 224, 0)"
};

export const SLOTS = { head: "Sans chapeau", side: "Rien sur les côtés", bread: "Pain de mie" };

export const GEAR = {
  witch: { slot: "head", name: "Chapeau de sorcière" },
  santa: { slot: "head", name: "Bonnet de Noël" },
  pirate: { slot: "head", name: "Chapeau de pirate" },
  ninja: { slot: "head", name: "Bandeau de ninja" },
  crown: { slot: "head", name: "Couronne" },
  chef: { slot: "head", name: "Toque de chef" },
  astronaut: { slot: "head", name: "Casque d'astronaute" },
  halo: { slot: "head", name: "Auréole" },
  nightcap: { slot: "head", name: "Bonnet de nuit" },
  dog: { slot: "head", name: "Oreilles de chien" },
  boosters: { slot: "side", name: "Boosters" },
  cutlery: { slot: "side", name: "Couteau et fourchette" },
  sixseven: { slot: "side", name: "Mains Six Seven" },
  bat: { slot: "side", name: "Ailes de chauve-souris" },
  toasted: { slot: "bread", name: "Pain grillé", crust: "#8f4b1a", crumb: "#dc9a52" },
  burnt: { slot: "bread", name: "Pain carbonisé", crust: "#4b3226", crumb: "#6a4a38" },
  brioche: { slot: "bread", name: "Brioche", crust: "#b9581b", crumb: "#ffdb8c" },
  crustless: { slot: "bread", name: "Sans croûte", crust: "#f6c983", crumb: "#f6c983" },
  hitbox: { slot: "bread", name: "Hitbox", crust: PALETTE.crust, crumb: PALETTE.crumb }
};

export const HEAT = ["#0d0b24", "#381496", "#6c1630"];

export const SKY = {
  lit: "rgba(13, 11, 36, 0)",
  shade: "rgba(13, 11, 36, 0.72)",
  gleam: "rgba(255, 246, 224, 0.14)",
  pancake: {
    base: "#c26d2c", crater: "#7a3a17", floor: "#a65a22",
    sideLight: "#a77c47", side: "#6f3d1a", topLight: "#b19666", top: "#9c6e39",
    glazeLight: "#789a38", glaze: "#396318", jarLight: "#9a2a3f", jar: "#580d1e", jam: "#440917"
  },
  violet: { band: "#a77fe0", storm: "rgba(255, 207, 51, 0.4)" },
  green: { light: "#4f9a55", dark: "#122b1c", band: "#a6d16a", ring: "#c8d65a" },
  speakers: {
    base: "#74419f", land: "#4f9a3f", landEdge: "#2f6526",
    box: "#1a1030", rim: "#4e3f75", rimLight: "#9583bd", cone: "#3d3060", wave: "#a77fd0"
  },
  moons: { light: "#5fa85a", dark: "#143320", crater: "#2c6435", floor: "#468a48" },
  rock: { light: "#bf6a2c", dark: "#341910", crater: "#713617", floor: "#9c4f22" },
  tung: { light: "#e6bd85", wood: "#bf8a4c", dark: "#6b4421", grain: "#7d5129", bat: "#f0d3a0", batDark: "#b58a52", eye: "#fff6e0", nose: "#8a5a2e" },
  toaster: {
    sky: "#2c2650", skyLight: "#928bc2", horizon: "#d9d3f2", ground: "#1f1a35", groundLight: "#5c5487", rim: "rgba(13, 11, 36, 0.6)", shine: "#ffffff",
    slot: "#14121f", glow: "#ffa04a", glowDark: "#8a2412", crust: "#9a4f1c", crumb: "#ecc27a", toasted: "#c47d36", bakelite: "#1a1424", bakeliteLight: "#4a3f63"
  },
  cheese: {
    light: "#ffe98f", mid: "#f7c843", dark: "#c98b1c", shade: "rgba(13, 11, 36, 0.5)",
    hole: "#e6aa30", holeDark: "#a86c16", holeLight: "#fbd766", cut: "#fff2b8", mouse: "#a29bb2", ear: "#d98a9a"
  },
  bass: {
    base: "#1d6f86", land: "#e2a43c", landEdge: "#a86e1c",
    box: "#0f1c2e", rim: "#3e6f8a", rimLight: "#8fd0e0", cone: "#25455c", wave: "#6fe0d8"
  },
  pirate: { light: "#8fe6ff", dark: "#1a6cc4", foam: "#e8fbff", sand: "#f6d98b", sandDark: "#c9a24f", palm: "#3fae4a", trunk: "#8a5a2e", hull: "#8a4b22", hullDark: "#5a2e12", trim: "#f2b13a", sail: "#fff6e0", flag: "#e0244a", mark: "#e0244a" },
  pumpkin: { light: "#ffb54d", mid: "#f07a12", dark: "#9c3f08", rib: "#b8520c", stem: "#6b7a2a", glow: "#ffe27a", deep: "#ff8a1a", stick: "#8a5a2e", straw: "#e0b35a", spill: "rgba(255, 214, 110, 0.4)", spillOut: "rgba(255, 214, 110, 0)" },
  melies: {
    light: "#f7f0de", dark: "#8f8468", spot: "#c9bd9c", shadow: "#6e624a", cheek: "#fffaf0", feature: "#4f4032", mouth: "#3a2a22", eye: "#fffdf4",
    goo: "#fff8e6", gooEdge: "#c9bfa6", cloud: "#f2ecdc", cloudDark: "#a89f8a", rocketLight: "#eef1f6", rocketDark: "#6f7686", window: "#2f3a5a"
  }
};

export const SPREADS = {
  butter: { name: "Beurre", color: "#fff1a8", shine: "#ffffff" },
  jam: { name: "Confiture", with: "à la confiture", color: "#9b1b3a", shine: "#e0577a", bits: true },
  choco: { name: "Pâte à tartiner", with: "à la pâte à tartiner", color: "#5b331d", shine: "#8a5636" },
  honey: { name: "Miel", with: "au miel", color: "#f0a81c", shine: "#ffd36b", drip: true },
  ketchup: { name: "Ketchup", with: "au ketchup", color: "#d8231b", shine: "#ff7a6b" },
  toothpaste: { name: "Dentifrice", with: "au dentifrice", color: "#f4f8ff", shine: "#e8303a" },
  egg: { name: "Œuf au plat", with: "à l'œuf", color: "#fdfdf5", shine: "#ffb81c" },
  sardine: { name: "Sardine", with: "à la sardine", color: "#9fb3c8", shine: "#e3ecf3" },
  slime: { name: "Slime", with: "au slime", color: "#5ed13a", shine: "#b8f59a", bits: true },
  dog: { name: "Pâtée pour chien", with: "à la pâtée pour chien", color: "#6e3f22", shine: "#b07a4e", bits: true }
};
