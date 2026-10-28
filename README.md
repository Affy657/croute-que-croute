# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, et le meilleur temps de la soirée gagne une conso (bière ou soft).

## Liens

- Jeu : https://croute-que-croute.croute-que-croute.workers.dev
- Admin : https://croute-que-croute.croute-que-croute.workers.dev/admin (appli « Croûte Admin », connexion par invitation)
- Adresse de test, séparée de la prod : https://test-croute-que-croute.croute-que-croute.workers.dev
- QR code : `qr/croute-que-croute.png` pour imprimer, `qr/croute-que-croute.svg` pour une affiche
- Code : `C:\dev\couverts-volants`, git local sur `master`, pas encore de dépôt GitHub
- POC d'origine (artefact Claude, plus mis à jour) : https://claude.ai/artifact/V2KMTGkcktubs8VguX8AxE

## Le jeu en bref

- On scanne le QR code, on choisit un pseudo, on joue autant qu'on veut.
- Le doigt glisse n'importe où et la tartine suit le mouvement. Elle ne se place pas sous le doigt, donc le doigt ne la cache pas.
- Score : le temps de survie, au centième.
- Seul le meilleur temps de chaque joueur compte.
- Le classement ferme à l'heure réglée dans l'admin, avec un compte à rebours dans le jeu.
- « Frôlé ! » s'affiche quand un couvert passe très près. C'est un effet visuel, sans points.

## Zone de jeu

- Terrain fixe de 360 × 640, le même pour tout le monde, agrandi pour remplir l'écran. Aucun téléphone n'a d'avantage.
- Zone de touche de la tartine : un cercle de 13 px de rayon, plus petit que le dessin.
- Rien n'arrive par le bas, car le doigt cacherait les attaques.
- Les attaques par les côtés partent seulement des 60 % du haut.
- Chaque attaque est annoncée par une flèche orange au bord, 0,45 à 0,7 s avant.

## Les attaques

### Couteau visé (dès 0 s)

- 1 couteau, lancé du haut ou d'un côté vers l'endroit où est la tartine au moment de l'annonce.
- Annonce 0,5 s avant : bouger pendant l'annonce suffit pour l'esquiver.
- Dès 35 s, 1 fois sur 3, le couteau tourne sur lui-même et occupe plus de place.

```
  >            flèche orange au bord
   \
    \          le couteau file en ligne droite
     \
     [T]       la tartine au moment de l'annonce
```

### Pluie de fourchettes (dès 6 s)

- 4 fourchettes, plus 1 toutes les 15 s (8 au maximum).
- Elles tombent du haut l'une après l'autre (une toutes les 0,14 s), un peu en biais.

```
  v     v  v      v    v      flèches en haut
  |     |  |      |    |
  |     |  |      |    |      chute presque droite
```

### Mur (dès 14 s)

- Une rangée de couverts serrés avec un seul trou d'environ 100 px.
- Par le côté : un couteau tous les 34 px, trou toujours dans les 62 % du haut.
- Par le haut : une fourchette tous les 36 px.
- Annonce 0,7 s avant : les flèches montrent déjà où est le trou.

```
Par le côté            Par le haut

>=====                 v v v v         v v v
>=====                 | | | |   trou  | | |
        <- trou        | | | |         | | |
>=====
>=====
```

### Éventail (dès 24 s)

- 5 couteaux lancés d'un même point, ouverts sur environ 50° et centrés sur la tartine. 6 couteaux à partir de 44 s, 7 à partir de 64 s.
- Départ d'un coin du haut, du milieu du haut, ou d'un côté à 40 % de la hauteur.
- Annonce 0,6 s avant. Il faut sortir du cône par le côté.

```
  >
   \ \  |  / /
    \ \ | / /
       [T]
```

## Progression de la difficulté

- Aujourd'hui, tout est aléatoire. La difficulté monte en continu et de nouvelles attaques se débloquent par paliers.
- Il n'y a pas encore de séquence scriptée ni de pic soudain : voir « À brainstormer ».

```
temps     0s      6s      14s     24s     35s     52s          80s
          |-------|-------|-------|-------|-------|------------|------>
visé      ################################################################
pluie             ########################################################
mur                       ################################################
éventail                          ########################################
tournant                                  ################################
vitesse   x1,0 ................................................ x2,6 (max)
rythme    1 attaque / 1,25 s ...................... 1 / 0,42 s (max)
```

| Réglage | Valeur |
|---|---|
| Vitesse des couverts | × (1 + t / 50), plafond × 2,6 atteint à 80 s |
| Délai entre deux attaques | 1,25 s - 0,016 × t, jamais moins de 0,42 s (atteint à 52 s) |
| Après une attaque à plusieurs couverts | délai × 1,5 (pluie, éventail) ou × 1,7 (mur) |
| Hasard sur le délai | ± 15 % |
| Chances de tirage | visé 3, pluie 1,4, mur 1,1, éventail 1,1 (parmi les attaques débloquées) |
| Vitesse de base | visé 230 px/s, éventail 200, pluie 190, mur 150 |

Repères mesurés avec des robots :

- Joueur immobile : mort vers 2,9 s.
- Robot qui esquive bêtement : environ 19 s.
- Robot parfait (qui suit le solveur) : tient 150 s sans mourir.

## Équité : jamais de situation impossible

- Avant chaque attaque, le jeu simule les 3,5 s suivantes avec tous les couverts en vol et annoncés, plus l'attaque candidate.
- Il cherche un chemin pour la tartine : grille de cases de 12 px, pas de 1/30 s, doigt à 360 px/s au plus, marge de 11 px autour de chaque couvert.
- Sans chemin, l'attaque est remplacée par une autre (jusqu'à 5 essais, un par image).
- Le modèle est prudent : si le robot passe, un humain peut passer.
- La garantie vaut au moment où l'attaque est lancée. Un joueur peut toujours se coincer tout seul ensuite.
- `npm test` fait jouer le robot pendant 100 parties de 150 s, avec puis sans le solveur.
- Dernier résultat : 0 mort avec le solveur, 4 sans (pièges entre 110 et 135 s). 0,1 % des attaques sont remplacées, et une vérification prend 2,3 ms en moyenne sur PC.

## Écrans

- Première visite : champ pseudo et bouton « C'est parti ».
- Accueil : titre, record et place si on a déjà joué, Jouer, Classement, compte à rebours.
- Fin de partie : temps, badge « Nouveau record », record et place, Rejouer, Classement. « Rejouer » est bloqué 0,45 s pour éviter de relancer par erreur.
- Classement : top 50, ta ligne en jaune, mis à jour toutes les 10 s.
- Après la fermeture : on peut encore jouer pour s'entraîner, et l'accueil félicite le premier.
- Police : Bungee partout, chargée depuis Google Fonts.
- Bouton haut-parleur en haut à droite (accueil, fin de partie, classement) pour couper ou remettre la musique. Caché pendant la partie et tant qu'il n'y a pas de musique.

## Musique

- Le jeu lit `public/music/theme.m4a` ou `public/music/theme.mp3` (le premier trouvé).
- En test : « Roundabout » de Blacklolita (M4A, 3 min 57), seulement sur l'adresse de test. Le fichier est dans `music-test/`, hors de git, et `npm run preview` l'envoie sur l'adresse de test sans toucher à la prod.
- `npm run music:test` génère à la place une boucle libre de droits (200 BPM, 19 s).
- En prod : pas de musique tant que les droits ne sont pas réglés.
- Elle démarre au premier appui sur l'écran (règle des navigateurs), tourne en boucle et se met en pause quand l'appli passe en arrière-plan.
- Le choix « musique coupée » est mémorisé sur le téléphone.
- Droits : diffuser un morceau dans une appli publique demande l'accord de l'artiste ou du label. Le plus simple : demander à Blacklolita, ou prendre un morceau d'un DJ du collectif.
- Poids : viser moins de 5 Mo (MP3 à 128 kb/s) pour le réseau du lieu.

## PWA et mises à jour

- Le jeu s'installe comme une appli : sur Android, bannière ou menu « Installer » ; sur iPhone, Partager puis « Sur l'écran d'accueil ».
- Service worker : il passe toujours par le réseau d'abord et garde une copie en secours, donc le jeu s'ouvre même sans réseau s'il a déjà été ouvert une fois.
- Chaque `npm run deploy` crée une version (date + commit), écrite dans `public/version.js` et donnée au serveur.
- Le jeu compare sa version à celle du serveur à l'ouverture, au retour dans l'appli et toutes les 30 s sur l'accueil. Si elle a changé, il se recharge tout seul, jamais en pleine partie.
- Le serveur refuse l'inscription et le début de partie d'une ancienne version (erreur 426), et le jeu se recharge aussitôt.
- Garde-fou : un seul rechargement automatique toutes les 15 s au plus.
- Testé en ligne le 28/10/2026 : rechargement automatique après un déploiement, et partie refusée puis rechargement pour une ancienne version.

## Admin

- Appli à part, « Croûte Admin », installable sur le téléphone depuis `/admin` (icône jaune).
- Connexion sans mot de passe, le téléphone reste connecté.
- Premier accès : la clé admin (`cle-admin.txt`) crée un compte propriétaire. Elle reste la clé de secours.
- Le propriétaire invite les collègues : prénom + rôle, puis un lien à usage unique, valable 48 h, à envoyer. La personne l'ouvre et elle est connectée.
- Rôles : propriétaire (soirées, joueurs et équipe) et admin (soirées et joueurs).
- Chaque téléphone connecté apparaît dans « Équipe » et peut être retiré : il est déconnecté aussitôt.
- On ne peut pas retirer le dernier propriétaire.
- Tableau de bord : soirée en cours, fin du classement avec compte à rebours, joueurs, parties, record, classement mis à jour toutes les 10 s, bouton pour retirer un tricheur.
- Les liens et les connexions sont stockés chiffrés (empreinte SHA-256) en base.

## Classement et triche

- Pseudo de 2 à 16 caractères, unique par soirée (majuscules, accents et espaces ignorés).
- À égalité, le premier à avoir fait le temps passe devant.
- Le serveur refuse un score plus long que le temps réellement écoulé depuis le début de la partie (avec 0,5 s de marge).
- Pas de compte : le téléphone garde un jeton. Changer de navigateur oblige à prendre un nouveau pseudo.
- Faille connue : quelqu'un d'habile peut lancer une partie, attendre, puis envoyer un faux score plausible. Parade : repérer les temps louches dans l'admin et retirer le joueur.

## Check-list d'une soirée

Avant :

- Dans Croûte Admin, « Nouvelle soirée » : nom et heure de fin. Le classement repart de zéro.
- Imprimer le QR code pour les tables, le bar et l'écran si le lieu en a un.
- Faire une partie depuis le QR code pour vérifier.

Pendant :

- Surveiller les temps louches dans Croûte Admin et retirer le joueur si besoin.
- Repousser l'heure de fin si la soirée glisse.

Après :

- Le gagnant montre son téléphone au bar : sa ligne est en jaune dans le classement.

## Technique

- Hébergement : Cloudflare, offre gratuite, compte d'Adrien. Coût : 0 €.
- Workers pour le site et l'API, base D1 (SQLite) en Europe de l'Ouest.
- Limite gratuite : 100 000 requêtes par jour. Une soirée de 150 joueurs en fait environ 20 000.
- Jeu en JavaScript sans compilation, API en TypeScript (compilée par wrangler).

| Fichier | Rôle |
|---|---|
| `public/sw.js`, `public/manifest.webmanifest` | PWA : service worker et manifeste |
| `public/version.js` | Version du jeu, réécrite à chaque déploiement |
| `public/icons/` | Icônes de l'appli, générées par `npm run icons` |
| `public/music/` | Musique (`theme.mp3`, à fournir) |
| `scripts/deploy.mjs` | Déploiement avec numéro de version |
| `public/sim.js` | Simulation : attaques, collisions, solveur. Sans affichage, partagée par le jeu et le test |
| `public/app.js` | Affichage, écrans, appels à l'API |
| `public/index.html`, `public/style.css` | Écrans et style |
| `public/admin.html`, `admin.js`, `admin.css`, `admin.webmanifest` | Appli admin |
| `test/admin.mjs` | Test de l'API admin (invitations, rôles, retrait) |
| `scripts/preview.mjs` | Mise en ligne sur l'adresse de test, avec la musique de `music-test/` |
| `scripts/test-music.mjs` | Boucle de musique libre de droits pour les tests |
| `src/worker.ts` | API : pseudo, parties, classement, admin |
| `migrations/` | Schéma de la base |
| `test/fairness.mjs` | Test du solveur avec le robot |
| `qr/` | QR codes |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire si la base change) |
| `npm run dev` | Jeu en local sur http://localhost:8787, admin avec la clé de `.dev.vars` |
| `npm test` | Robot du solveur, 0 mort attendu (environ 4 min) |
| `npm run check` | Vérifier les types de l'API |
| `npm run deploy` | Mettre en ligne avec une nouvelle version (les téléphones se mettent à jour seuls) |
| `npm run icons` | Regénérer les icônes du jeu et de l'admin |
| `npm run preview` | Mettre en ligne sur l'adresse de test seulement |
| `npm run music:test` | Générer la boucle de test libre de droits |
| `node test/admin.mjs` | Tester l'API admin (avec `npm run dev` lancé) |
| `npm run db:remote` | Appliquer une nouvelle migration sur la base en ligne |

## À faire

- Reprendre les couleurs et la tartine de l'affiche numérique (Adrien envoie le fichier).
- Obtenir l'accord de l'artiste avant de mettre la musique en prod.
- Inviter les collègues admins depuis Croûte Admin.
- Créer la vraie soirée du samedi 07/11 sur `/admin`.
- Tester sur de vrais téléphones : fluidité, son, réseau du lieu.

## À brainstormer

- Bruitages : en priorité le nouveau record en fin de partie, puis le frôlement, la mort et le départ.
- Nouveaux projectiles : d'autres ustensiles, d'autres trajectoires.
- Variantes rares et drôles : des couteaux avec autre chose que du beurre, pour des clins d'œil. Purement visuel, l'équité ne change pas.
- Phases structurées : séquences scriptées, moments calmes, pics soudains.
- Caler les attaques sur les drops de la musique (idée, pas sûr).
- Images rigolotes qui défilent dans le fond : références aux anciennes soirées et aux délires du collectif (par exemple un maximator qui tourne).
- Partage du score en story Insta.
- Écran géant : classement en plein écran si le lieu en a un.
- Adresse plus courte : sous-domaine `tartine-sauvage` à changer dans Cloudflare, puis régénérer le QR code.

## Bon à savoir

- La soirée de test ouverte en ligne ferme le 29/10/2026 à 23h30.
- `cle-admin.txt` et `.dev.vars` ne sont pas dans git : à garder de côté. Les liens d'invitation non utilisés (`invitation-*.txt`) non plus.
- L'adresse de test partage la base de la prod : un score fait en test compte dans la soirée en cours.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami` pour vérifier).
- Une fois la page chargée, le jeu tourne sans réseau. Le score ne compte que si le réseau passe au début et à la fin de la partie (3 essais d'envoi).
- Le record perso hors classement reste sur le téléphone.
