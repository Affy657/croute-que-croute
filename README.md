# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, et le meilleur temps de la soirée gagne une conso (bière ou soft).

## Liens

- Jeu : https://croute-que-croute.croute-que-croute.workers.dev
- Admin : https://croute-que-croute.croute-que-croute.workers.dev/admin, dans la même appli que le jeu
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
- Deux boutons ronds, cachés pendant la partie : la note de musique en haut à gauche coupe ou remet la musique, le haut-parleur en haut à droite coupe ou remet les bruitages. Chaque choix est mémorisé sur le téléphone.
- Bouton « Admin » discret en bas de l'accueil, seulement sur les téléphones connectés en admin.

## Musique

- Le jeu lit `public/music/theme.m4a` ou `public/music/theme.mp3` (le premier trouvé).
- En prod : « Roundabout » de Blacklolita (M4A, 3 min 57, 3,8 Mo), choisi par Adrien en attendant les morceaux des collègues.
- Le fichier n'est pas dans git (droits et poids) : il est seulement dans `public/music/` sur le PC. À remettre là avant un déploiement depuis un autre ordinateur.
- Changer de musique : remplacer `public/music/theme.m4a`, puis `npm run deploy`.
- Elle ne joue que pendant une partie : elle repart du début à chaque partie, pour que la montée du morceau suive la montée de la difficulté, et s'arrête en fondu à la mort. Silence sur l'accueil et l'écran de fin.
- Le bouton musique ne lance rien : il mémorise seulement le choix pour les prochaines parties.
- Si le morceau prend du retard sur la partie (réseau lent, téléphone qui rame), le jeu le recale dès que l'écart dépasse 0,35 s.
- Les navigateurs bloquent le son tant qu'on n'a pas touché l'écran. Le premier appui prépare la musique en silence. Si le téléphone bloque quand même au lancement, la musique démarre au premier lever de doigt, calée sur le temps de la partie.
- Elle se met en pause quand l'appli passe en arrière-plan.
- Droits : diffuser un morceau dans une appli publique demande l'accord de l'artiste ou du label. Le plus simple : demander à Blacklolita, ou prendre un morceau d'un DJ du collectif.
- Poids : viser moins de 5 Mo (MP3 à 128 kb/s) pour le réseau du lieu.

## Bruitages

- Style arcade, fabriqués dans le code (`public/js/app/sfx.js`) : aucun fichier, aucun droit, 0 €. Choix d'Adrien du 28/10/2026.

| Moment | Son |
|---|---|
| Départ | Allumage des fusées : souffle qui monte et grondement |
| Frôlé | « Fshh » de lame très court, discret, un seul toutes les 0,08 s au plus |
| Mort | Croc de tartine croquée (rappel du logo TTS) et choc sourd |
| Nouveau record | Jingle de 4 notes qui monte (do, mi, sol, do), joué sur l'écran de fin |
| Passer 1er | Version plus grosse : 5 notes puis un accord tenu qui brille |

- Le jeu attend la réponse du serveur (1,2 s au plus) pour savoir s'il joue le record ou la 1re place.
- Pas de son sur les flèches d'avertissement : trop fréquent, et ça avantagerait ceux qui jouent avec le son.
- Niveaux réglés et vérifiés sans saturation : mort, record et 1re place forts, départ moyen, frôlé discret. Un limiteur protège les haut-parleurs.
- Écouter les sons : carte « Bruitages » en bas du tableau de bord admin.
- Coupés par le bouton haut-parleur, indépendamment de la musique.
- Sur iPhone, le bouton silencieux du téléphone coupe les bruitages mais pas la musique (règle d'Apple).
- Remplacer un son par un enregistrement : déposer le fichier dans `public/sfx/` et mettre son chemin dans `SOUNDS` (`audio.js`), par exemple `record: "/sfx/record.mp3"`.

## PWA et mises à jour

- Le jeu s'installe comme une appli : sur Android, bannière ou menu « Installer » ; sur iPhone, Partager puis « Sur l'écran d'accueil ».
- Service worker : il passe toujours par le réseau d'abord et garde une copie en secours, donc le jeu s'ouvre même sans réseau s'il a déjà été ouvert une fois.
- Chaque `npm run deploy` crée une version (date + commit), écrite dans `public/js/version.js` et donnée au serveur.
- Le jeu compare sa version à celle du serveur à l'ouverture, au retour dans l'appli et toutes les 30 s sur l'accueil. Si elle a changé, il se recharge tout seul, jamais en pleine partie.
- Le serveur refuse l'inscription et le début de partie d'une ancienne version (erreur 426), et le jeu se recharge aussitôt.
- Garde-fou : un seul rechargement automatique toutes les 15 s au plus.
- Testé en ligne le 28/10/2026 : rechargement automatique après un déploiement, et partie refusée puis rechargement pour une ancienne version.

## Admin

- Même appli que le jeu : une seule installation. Un téléphone connecté en admin voit un bouton « Admin » en bas de l'accueil, qui ouvre le tableau de bord. « Retour au jeu » ramène au jeu.
- Accès caché : 5 appuis rapides sur « Collectif Tartine Sauvage » ouvrent l'écran admin.
- Connexion sans mot de passe, le téléphone reste connecté.
- Dans l'appli installée (surtout sur iPhone, où les liens s'ouvrent dans Safari), on peut coller le lien d'invitation dans « Lien d'invitation reçu ».
- Premier accès : la clé admin (`cle-admin.txt`) crée un compte propriétaire. Elle reste la clé de secours.
- Le propriétaire invite les collègues : prénom + rôle, puis un lien à usage unique, valable 48 h, à envoyer. La personne l'ouvre et elle est connectée.
- Rôles : propriétaire (soirées, joueurs et équipe) et admin (soirées et joueurs).
- Chaque téléphone connecté apparaît dans « Équipe » et peut être retiré : il est déconnecté aussitôt.
- On ne peut pas retirer le dernier propriétaire.
- Tableau de bord : soirée en cours, fin du classement avec compte à rebours, joueurs, parties, record, classement mis à jour toutes les 10 s, bouton pour retirer un tricheur.
- « Record à vérifier » (trait rouge) : le record a pris nettement plus de temps réel que le score (plus de 15 % et 15 s d'écart). Signe d'un jeu ralenti exprès, ou d'une appli mise en arrière-plan en pleine partie.
- Une nouvelle soirée ne peut être créée qu'une fois la précédente fermée : avancer d'abord son heure de fin à maintenant. Ça évite d'effacer le classement en pleine soirée par erreur.
- Les liens et les connexions sont stockés chiffrés (empreinte SHA-256) en base.

## Classement et triche

- Pseudo de 2 à 16 caractères, unique par soirée (majuscules, accents et espaces ignorés).
- À égalité, le premier à avoir fait le temps passe devant.
- Pseudo en lettres latines (accents permis), chiffres, espaces, tirets : les sosies avec des lettres cyrilliques ou grecques sont refusés.
- Le serveur refuse un score plus long que le temps réellement écoulé depuis le début de la partie (5 s de marge pour les réseaux lents), et tout score au-delà de 15 min.
- Un score renvoyé deux fois (réseau qui coupe) est compté une seule fois, sans message d'erreur.
- Pas de compte : le téléphone garde un jeton. Le même téléphone qui reprend son pseudo retrouve son compte. Un autre navigateur (Safari puis appli installée sur iPhone) oblige à prendre un nouveau pseudo.
- Limites contre les abus : 30 inscriptions par minute et par adresse IP (tout le lieu partage souvent la même), 10 débuts de partie par 10 s et par joueur.
- Faille connue : quelqu'un d'habile peut lancer une partie, attendre, puis envoyer un faux score plausible. Parade actuelle : repérer les temps louches dans l'admin et retirer le joueur. Parade complète possible : rejouer la partie à partir des gestes enregistrés (voir « À faire »).

## Check-list d'une soirée

Avant :

- Dans le tableau de bord, fermer la soirée précédente (heure de fin à maintenant), puis « Nouvelle soirée » : nom et heure de fin. Le classement repart de zéro.
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
- Limites gratuites par jour : 100 000 requêtes, 5 millions de lignes lues et 100 000 lignes écrites en base. Au-delà, l'API répond en erreur jusqu'à 1 h du matin (minuit UTC).
- Pour tenir ces limites : le classement est gardé 5 s en mémoire par le serveur, chaque joueur garde son nombre de parties (pas de comptage sur toutes les parties), et chaque requête passe par un index. Une partie coûte environ 5 lignes écrites, une consultation du classement 2 lignes lues.
- En-têtes de sécurité sur toutes les pages (`public/_headers`) : pas de script externe, pas d'affichage dans un cadre d'un autre site.
- Jeu en JavaScript sans compilation, API en TypeScript (compilée par wrangler).

| Fichier | Rôle |
|---|---|
| `public/index.html`, `style.css` | Écrans et style du jeu |
| `public/js/game/` | Le jeu sans affichage, partagé par le navigateur et les tests |
| `public/js/game/field.js` | Taille du terrain, hitbox, vitesse selon le temps |
| `public/js/game/projectiles.js` | Catalogue des projectiles (taille de chaque ustensile) |
| `public/js/game/attacks.js` | Catalogue des attaques : apparition, poids, durée, trajectoires |
| `public/js/game/solver.js` | Solveur d'équité |
| `public/js/game/sim.js` | Boucle de jeu : lancement des attaques, collisions, frôlements |
| `public/js/app/main.js` | Chef d'orchestre : états (accueil, partie, fin, classement), boucle d'affichage |
| `public/js/app/scene.js` | Dessin du fond, du terrain et des effets |
| `public/js/app/sprites.js` | Dessin de la tartine et de chaque projectile |
| `public/js/app/screens.js` | Écrans HTML : accueil, fin, classement, boutons |
| `public/js/app/api.js` | Appels au serveur, classement, mise à jour de version |
| `public/js/app/audio.js` | Musique et lecture des bruitages |
| `public/js/app/sfx.js` | Fabrication des bruitages |
| `public/js/app/input.js` | Glisser du doigt et souris |
| `public/js/shared/` | Stockage du téléphone et formats, partagés avec l'admin |
| `public/js/admin/admin.js`, `public/admin.html`, `admin.css` | Tableau de bord admin |
| `public/js/version.js` | Version du jeu, réécrite à chaque déploiement |
| `public/sw.js`, `manifest.webmanifest` | PWA : service worker et manifeste |
| `public/_headers` | En-têtes de sécurité des pages |
| `public/icons/` | Icônes de l'appli, générées par `npm run icons` |
| `public/music/` | Musique (`theme.m4a`, hors git) |
| `src/worker.ts` | Entrée de l'API et liste des routes |
| `src/routes/player.ts`, `src/routes/admin.ts` | Routes joueurs et admin |
| `src/router.ts` | Aiguillage des routes et contrôle admin / propriétaire |
| `src/db.ts` | Lectures communes et classement gardé 5 s en mémoire |
| `src/http.ts`, `security.ts`, `validate.ts` | Réponses, limites de requêtes, jetons, contrôle des pseudos |
| `migrations/` | Schéma de la base |
| `scripts/deploy.mjs` | Déploiement avec numéro de version |
| `test/fairness.mjs` | Test du solveur avec le robot |
| `test/player.mjs`, `test/admin.mjs` | Tests de l'API joueurs et admin |
| `qr/` | QR codes |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire si la base change) |
| `npm run dev` | Jeu en local sur http://localhost:8787, admin avec la clé de `.dev.vars` |
| `npm test` | Robot du solveur, 0 mort attendu (environ 4 min) |
| `npm run check` | Vérifier les types de l'API |
| `npm run deploy` | Mettre en ligne avec une nouvelle version (les téléphones se mettent à jour seuls) |
| `npm run icons` | Regénérer les icônes de l'appli |
| `npm run test:api` | Tester l'API joueurs et admin (avec `npm run dev` lancé) |
| `npm run db:remote` | Appliquer une nouvelle migration sur la base en ligne |

## Ajouter du contenu

- Nouvelle attaque : une fonction dans `attacks.js` qui renvoie ses avertissements et projectiles, puis une ligne dans `ATTACKS` (à partir de quand, poids, durée). Le solveur la vérifie tout seul.
- Nouveau projectile : sa taille dans `projectiles.js` et son dessin dans `sprites.js` (même nom).
- Nouveau bruitage : voir « Bruitages ».
- Nouvel événement de partie (objet ramassé, etc.) : `sim.js` le renvoie dans la liste d'événements de `step`, et `main.js` y réagit dans `ON_SIM`.
- Nouvelle route d'API : une fonction dans `src/routes/` et une ligne dans la liste de `src/worker.ts`, avec le niveau d'accès (public, admin, propriétaire).
- Toujours relancer `npm test` après avoir touché au jeu : 0 mort attendu.

## À faire

- Reprendre les couleurs et la tartine de l'affiche numérique (Adrien envoie le fichier).
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Inviter les collègues admins depuis Croûte Admin.
- Créer la vraie soirée du samedi 07/11 sur `/admin`.
- Tester sur de vrais téléphones : fluidité, son, réseau du lieu.
- À décider : vérifier les meilleurs scores en rejouant la partie. Le serveur donne une graine, le jeu enregistre les gestes, et le tableau de bord rejoue les 3 premiers pour confirmer leur temps. Bloquerait la triche par faux score.

## À brainstormer

- Nouveaux projectiles : d'autres ustensiles, d'autres trajectoires.
- Variantes rares et drôles : des couteaux avec autre chose que du beurre, pour des clins d'œil. Purement visuel, l'équité ne change pas.
- Phases structurées : séquences scriptées, moments calmes, pics soudains.
- Caler les attaques sur les drops de la musique (idée, pas sûr).
- Images rigolotes qui défilent dans le fond : références aux anciennes soirées et aux délires du collectif (par exemple un maximator qui tourne).
- Mini wiki dans le jeu : une page qui présente chaque type d'attaque (dessin, nom, à partir de quand elle arrive, comment l'esquiver).
- Collection : des objets à attraper en passant la tartine dessus (par exemple le maximator qui tourne). Chaque objet trouvé rejoint la collection du joueur dans le jeu.
  - Un nombre fixe d'objets, ceux pas encore trouvés sont affichés en ombre.
  - En fin de partie, l'écran montre les objets attrapés pendant la partie.
  - À trancher : est-ce que ça donne un avantage au classement (non, pour rester juste ?), la collection est-elle liée à la soirée ou au téléphone.
- Partage du score en story Insta.
- Écran géant : classement en plein écran si le lieu en a un.
- Adresse plus courte : sous-domaine `tartine-sauvage` à changer dans Cloudflare, puis régénérer le QR code.

## Bon à savoir

- La soirée de test ouverte en ligne ferme le 29/10/2026 à 23h30.
- `cle-admin.txt` et `.dev.vars` ne sont pas dans git : à garder de côté. Les liens d'invitation non utilisés (`invitation-*.txt`) non plus.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami` pour vérifier).
- Une fois la page chargée, le jeu tourne sans réseau. Le score ne compte que si le réseau passe au début et à la fin de la partie (3 essais d'envoi).
- Le record perso hors classement reste sur le téléphone.
