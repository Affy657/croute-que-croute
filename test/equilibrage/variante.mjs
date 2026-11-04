import { cpSync, existsSync } from "node:fs";

const name = process.argv[2];
if (!name || !/^[\w-]+$/.test(name)) {
  console.log("Usage : npm run equilibrage:variante -- <nom>");
  process.exit(1);
}
const dir = ".equilibrage/" + name;
if (existsSync(dir)) {
  console.log(`${dir} existe déjà : modifie-le ou choisis un autre nom.`);
  process.exit(1);
}
cpSync("public/js/game", dir, { recursive: true });
cpSync("public/js/shared", ".equilibrage/shared", { recursive: true });
console.log(`Copie du coeur du jeu dans ${dir}. Modifie les réglages dedans, puis compare :`);
console.log(`npm run equilibrage -- public/js/game ${dir}`);
