# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, le meilleur temps de la soirée gagne une conso (bière ou soft).

- `public/` : le jeu (`index.html`, `app.js`, `style.css`) et la page admin (`admin.html`)
- `src/worker.ts` : l'API (pseudo, parties, classement, admin)
- `migrations/` : la base D1 (SQLite)

## Lancer en local

```bash
npm install
npm run db:local
npm run dev
```

- Jeu : http://localhost:8787
- Admin : http://localhost:8787/admin, avec la clé du fichier `.dev.vars` (à créer : `ADMIN_KEY=une-cle`)

## Mettre en ligne (offre gratuite Cloudflare)

1. Créer un compte Cloudflare.
2. `npx wrangler login`
3. `npx wrangler d1 create croute-que-croute`, puis coller le `database_id` affiché dans `wrangler.jsonc`.
4. `npm run db:remote`
5. `npx wrangler secret put ADMIN_KEY` et choisir une clé.
6. `npm run deploy` : l'adresse du jeu (en `.workers.dev`) s'affiche à la fin.

## Avant chaque soirée

Sur `/admin` : créer la soirée avec l'heure de fin du classement. Le classement repart de zéro. Le QR code pointe simplement vers l'adresse du jeu.

## Règles du classement

- Parties illimitées, seul le meilleur temps de chaque joueur compte.
- À égalité, le premier à avoir fait le temps passe devant.
- Le serveur refuse un score plus long que le temps réellement écoulé depuis le début de la partie.
- L'admin peut retirer un joueur du classement.

## Plus tard

- Couleurs et tartine reprises de l'affiche numérique.
- Musique de fond (morceaux fournis par le collectif).
- Idée, pas sûr : caler des vagues d'attaques sur les drops des morceaux.
- Partage du score en story Insta.
- Écran géant : afficher le classement en plein écran si le lieu en a un.
