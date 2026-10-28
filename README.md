# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, le meilleur temps de la soirée gagne une conso (bière ou soft).

- `public/sim.js` : la simulation du jeu (attaques, collisions, solveur), sans affichage
- `public/` : l'affichage du jeu (`index.html`, `app.js`, `style.css`) et la page admin (`admin.html`)
- `test/fairness.mjs` : le robot qui vérifie qu'aucune situation n'est impossible
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

## En ligne

- Jeu : https://croute-que-croute.croute-que-croute.workers.dev
- Admin : https://croute-que-croute.croute-que-croute.workers.dev/admin, avec la clé du fichier `cle-admin.txt` (non commité)
- QR code à imprimer : `qr/croute-que-croute.png` (ou `.svg` pour une affiche)
- Hébergement : offre gratuite Cloudflare (Workers + base D1 en Europe de l'Ouest), compte d'Adrien

Mettre à jour le jeu en ligne : `npm run deploy`. Nouvelle migration de base : `npm run db:remote`.

## Avant chaque soirée

Sur `/admin` : créer la soirée avec l'heure de fin du classement. Le classement repart de zéro. Le QR code pointe simplement vers l'adresse du jeu.

## Règles du classement

- Parties illimitées, seul le meilleur temps de chaque joueur compte.
- À égalité, le premier à avoir fait le temps passe devant.
- Le serveur refuse un score plus long que le temps réellement écoulé depuis le début de la partie.
- L'admin peut retirer un joueur du classement.

## Aucune situation impossible

Avant de lancer une attaque, le jeu vérifie qu'il reste au moins un chemin pour s'en sortir, en tenant compte de tous les couverts déjà en vol et annoncés. Le calcul découpe l'écran en cases de 12 px et avance par pas de 1/30 s, avec un doigt qui se déplace à environ 360 px/s au plus et une marge autour de chaque couvert. Si aucun chemin n'existe, l'attaque est remplacée par une autre.

`npm test` fait jouer un robot qui suit ces chemins pendant 100 parties de 150 s. Il ne doit jamais mourir. Le test lance aussi les mêmes parties sans la vérification, pour comparer.

## Plus tard

- Couleurs et tartine reprises de l'affiche numérique.
- Musique de fond (morceaux fournis par le collectif).
- Idée, pas sûr : caler des vagues d'attaques sur les drops des morceaux.
- Partage du score en story Insta.
- Écran géant : afficher le classement en plein écran si le lieu en a un.
