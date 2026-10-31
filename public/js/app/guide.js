import { NEAR } from "../game/field.js";
import { GEAR, SPREADS } from "../shared/palette.js";
import { el, canvas, stat, fold } from "./catalog.js";
import { ACHIEVEMENTS, FAMILIES, has, progress } from "./achievements.js";
import { gearUnlocked } from "./gear.js";
import { unlocked } from "./toppings.js";
import { drawToast } from "./sprites.js";
import { BODIES, PASSERS } from "./planets.js";

const ART_W = 84, ART_H = 76, SKY_W = 130, SKY_H = 100, PASSER_S = 56;
const SHELVES = [["head", "Chapeaux"], ["side", "Côtés"], ["bread", "Pains"]];
const SOURCE = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.gear).map((a) => [a.gear, a]));

function art(draw, scale, w = ART_W, h = ART_H) {
  const cv = canvas(w, h);
  const ctx = cv.getContext("2d");
  const k = cv.dpr * scale;
  ctx.setTransform(k, 0, 0, k, (cv.dpr * w) / 2, (cv.dpr * h) / 2);
  draw(ctx);
  return cv;
}

const toastArt = (look, scale) =>
  art((ctx) => drawToast(ctx, { x: 0, y: 0, tilt: 0, thrust: 0.35, spread: "butter", head: null, side: null, bread: null, ...look }, null), scale);

function item(cv, name, meta, got = true) {
  const card = el("div", got ? "weapon" : "weapon locked");
  card.append(cv, el("span", "name", name));
  if (meta) card.append(el("span", "meta", meta));
  return card;
}

function gallery(cards, wide = false) {
  const grid = el("div", wide ? "gallery" : "gallery tight");
  grid.append(...cards);
  return grid;
}

function bullets(...lines) {
  const list = el("ul", "rules");
  for (const text of lines) list.append(el("li", null, text));
  return list;
}

function body(...children) {
  const node = el("div", "fold-body");
  node.append(...children);
  return node;
}

const count = (got, total) => el("span", "fold-tag", `${got} / ${total}`);

function nears() {
  return fold("Frôlés", null, () => body(bullets(
    `Passe à moins de ${NEAR} px d'un couvert sans te faire toucher : c'est un frôlé.`,
    "Enchaîne-les à moins de 1,5 s d'écart pour monter le combo : x2, x3…",
    "Chaque frôlé laisse une entaille sur ta croûte. Ton score ne bouge pas, mais des succès et les garnitures en dépendent."
  )));
}

function toppings() {
  const kinds = Object.keys(SPREADS).filter((k) => !SPREADS[k].free);
  return fold("Garnitures", count(kinds.filter(unlocked).length, kinds.length), () => body(
    bullets(
      "Une attaque à couteaux sur 10 cache un couteau garni. Frôle-le ou fais-toi tartiner par lui : sa garniture est à toi.",
      "Ça ne marche pas en entraînement.",
      "Touche ta tartine sur l'accueil pour changer de garniture."
    ),
    gallery(kinds.map((k) => item(toastArt({ spread: k }, 1.2), SPREADS[k].name, null, unlocked(k))))
  ));
}

function gear() {
  const kinds = Object.keys(GEAR);
  return fold("Accessoires", count(kinds.filter(gearUnlocked).length, kinds.length), () => body(
    bullets(
      "Chaque accessoire se gagne avec un succès.",
      "Touche ta tartine sur l'accueil : une ligne de flèches par emplacement."
    ),
    ...SHELVES.flatMap(([slot, title]) => [
      el("h3", null, title),
      gallery(kinds.filter((k) => GEAR[k].slot === slot).map((k) => {
        const a = SOURCE[k], secret = a.family === "secret" && !has(a.id);
        return item(toastArt({ [slot]: k }, slot === "side" ? 0.7 : 0.8), GEAR[k].name, secret ? "Succès secret" : a.desc, gearUnlocked(k));
      }))
    ])
  ));
}

function feats() {
  const p = progress();
  const facts = el("div", "facts");
  facts.append(...FAMILIES.map(([family, title]) => {
    const list = ACHIEVEMENTS.filter((a) => a.family === family);
    return stat(title, `${list.filter((a) => has(a.id)).length} / ${list.length}`);
  }));
  return fold("Succès", count(p.got, p.total), () => body(
    bullets(
      "Les secrets restent cachés, avec un indice, tant que tu ne les as pas.",
      "Certains donnent un accessoire.",
      "La liste complète est dans Succès, sur l'accueil."
    ),
    facts
  ));
}

function sky() {
  const planet = (b) => item(art((ctx) => b.draw(ctx, (SKY_H / 2 - 2) / b.reach, 0), 1, SKY_W, SKY_H), b.name);
  const passer = (p) => item(art((ctx) => p.draw(ctx, (PASSER_S * p.size) / PASSERS.saucer.size / (p.span || 1), 0), 1), p.name);
  return fold("Le ciel", null, () => body(
    bullets(
      "Les planètes défilent par tours de 8 : 5 normales, 2 extravagantes et 1 drôle.",
      "Toutes les 2 à 4 min, une étoile filante traverse le fond."
    ),
    el("h3", null, "Planètes drôles"),
    gallery(BODIES.rare.map(planet), true),
    el("h3", null, "Planètes extravagantes"),
    gallery(BODIES.wild.map(planet), true),
    el("h3", null, "Étoiles filantes"),
    gallery(Object.values(PASSERS).map(passer))
  ));
}

function boards() {
  return fold("Classements", null, () => body(bullets(
    "Trois classements : Soirée, Mobile et PC. Il te faut un pseudo pour y entrer.",
    "Le jeu voit si tu joues au doigt ou à la souris. Une partie à la souris compte seulement au classement PC.",
    "À égalité, le premier à avoir fait le temps passe devant.",
    "Touche un joueur pour ouvrir sa fiche."
  )));
}

function nights() {
  return fold("Soirées", null, () => body(bullets(
    "Pendant une soirée Space Tartinade, un classement à part s'ouvre : c'est lui qui compte pour le lot.",
    "Les parties sur PC n'y comptent pas.",
    "Une partie commencée avant la fin compte encore 5 min après. Le gagnant est annoncé ensuite.",
    "Succès à la clé : Dans le top (top 10), Tartine d'or (1er) et Fidèle du Space (3 soirées)."
  )));
}

function account() {
  return fold("Compte", null, () => body(bullets(
    "Pas de mot de passe : ton compte est gardé sur ton téléphone.",
    "Pour jouer ailleurs : Paramètres, Autre appareil, Afficher mon code. Sur l'autre appareil, scanne le QR ou touche « J'ai déjà un compte » et tape le code.",
    "Succès et garnitures te suivent partout. La tenue portée et les réglages restent sur chaque appareil.",
    "Deux comptes ? « J'ai un code » les réunit en un seul.",
    "Quelqu'un d'autre est sur ton compte ? « Déconnecter les autres » le sort."
  )));
}

export function renderGuide(root) {
  root.replaceChildren(nears(), toppings(), gear(), feats(), sky(), boards(), nights(), account());
}
