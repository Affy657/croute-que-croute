# Croûte que Croûte

Jeu web à classement pour les soirées Space Tartinade de Tartine Sauvage. Cloudflare Workers, D1 et Durable Object, API en TypeScript, front en JS sans build.

Prod : https://croute-que-croute.tartinesauvage.fr

`README.md` est la source unique de connaissance : jeu, équité, soirées, technique, versions, à faire. Lire la section concernée avant de modifier quelque chose, et la tenir à jour dans le même changement. On y écrit le comportement et les règles utiles, pas l'historique des réglages, les dates de demande ni ce que le code dit déjà.

## Échanges

- Répondre en français.
- Poser les questions dans le texte de la réponse, avec une recommandation, jamais dans une fenêtre de questions.

## Code

- Pas de commentaire explicatif. JSDoc `@type` et `@param` acceptés.
- Chaque bug corrigé reçoit un test, vérifié par mutation.
- Les fichiers du dépôt sont en CRLF : jamais de `sed -i`. Passer par l'outil d'édition, ou Python avec `newline=""`.

## Commandes

- Serveur local : configuration `croute-que-croute` de `.claude/launch.json`, port 8787. Le laisser tourner.
- Types : `npm run check`
- Tests unitaires : `npm test`
- API : `TEST_PORT=8796 npm run test:api`
- Navigateur : `TEST_PORT=8797 npm run test:navigateur`, et `NAVIGATEUR=webkit TEST_PORT=8797 npm run test:navigateur` pour WebKit.

## Git

- Travailler sur une branche, pas directement sur `master`. Un nom de branche ne commence pas par `equilibrage/`.
- `git checkout master`, `git merge --no-ff <branche>`, `git push origin master`.

## Mise en ligne

Seulement sur accord explicite, à chaque fois.

1. Monter la version dans `package.json` et `package-lock.json` (2 entrées), puis ajouter sa ligne dans la section Versions du README. 2e chiffre : nouveauté visible ou comportement d'attaque. 3e chiffre : le reste.
2. Vérifier les fichiers absents de git : 5 fichiers dans `public/sfx` et `public/music/theme.m4a`. Sans eux, le jeu part en ligne sans son. Sauvegarde des bruitages dans `sauvegardes/sfx/`. `npm run deploy` refuse s'il en manque ou s'il y en a d'autres.
3. Pousser, puis lancer `gh workflow run tests.yml --ref master`, `gh workflow run safari.yml --ref master` et `gh workflow run equite.yml --ref master` : le garde-fou veut Tests, Safari et Équité verts.
4. `npm run db:remote`, puis `npm run deploy`. Les deux refusent moins de 2 h avant l'ouverture d'une soirée et pendant celle-ci : `-- --pendant-soiree` en urgence seulement.

## Fichiers à protéger

- Ne jamais ouvrir ni afficher `cle-admin.txt`, `.dev.vars` et `invitation-*.txt`. Le code de test peut lire `.dev.vars` tout seul.
- Ne jamais ajouter à git ces fichiers, `sauvegardes/`, `ecoute-sons/`, `.equilibrage/`, la musique et `public/sfx/*.mp3`.
- Les clés de production sont posées par le propriétaire du projet, jamais par Claude.
