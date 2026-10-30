# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, et le meilleur temps de la soirée gagne une conso.

## Liens

- Jeu : https://croute-que-croute.tartine-sauvage.workers.dev
- Admin : `/admin`, dans la même appli que le jeu
- Écran géant : `/ecran`, sur l'ordinateur branché à l'écran ou au vidéoprojecteur
- Code : https://github.com/Affy657/croute-que-croute (privé), copie locale dans `C:\dev\couverts-volants`
- QR codes : `qr/croute-que-croute.png` pour imprimer, `.svg` pour une affiche, version simple en secours `qr/croute-que-croute-simple.*`. Le même est dans le jeu (Paramètres, « QR code »). Régénérer : `npm run qr`, ou `npm run qr -- <adresse>`. À scanner sur plusieurs téléphones avant d'imprimer.

## Le jeu

- On scanne le QR code, on choisit un pseudo, on joue autant qu'on veut. Sans pseudo, la partie ne compte pas au classement.
- Le doigt glisse n'importe où : la tartine suit le mouvement, 1,8 fois plus loin que le doigt, pour que le doigt ne la cache pas.
- La partie démarre avec la tartine là où elle volait sur l'accueil. Sur téléphone, un rond pulse en bas (`PUCK_LIFT` dans `scene.js`) pour montrer où poser le doigt.
- Rien n'arrive par le bas (le doigt cacherait les attaques). Les attaques de côté partent des 60 % du haut.
- Chaque attaque est annoncée 0,45 à 0,9 s avant par une pastille au bord de l'écran, jamais posée sur le chrono.
- La difficulté monte jusqu'à 80 s, puis plus rien ne change.
- Zones de touche : la tartine est un cercle de 26 px, chaque arme est faite de gélules (`parts` dans `projectiles.js`). « Frôlé » quand la tartine passe à moins de 11 px.
- Frôlés : « Frôlé x2 », « x3 »… quand ils s'enchaînent à moins de 1,5 s, avec un son plus aigu à chaque cran (6 au plus). Chaque frôlé laisse une entaille dans la croûte, du côté où le couvert est passé (12 au plus). Aucun effet sur le score ni sur la zone de touche.
- Effets : le chrono flashe en jaune toutes les 10 s, les couverts rapides (dès 380 px/s) laissent une traînée, et le fond passe du bleu nuit au violet vers 40 s puis au rouge sombre à 80 s, au rythme de la vitesse des couverts (`HEAT` dans `palette.js`).
- Mort : le jeu se fige 0,3 s, puis l'éclaboussure. Sous « Tartinée ! », l'arme qui t'a eu (« par un hachoir », « par un couteau au dentifrice ») : `by` dans `PROJECTILES`, `with` dans `SPREADS`.
- Garnitures : 9 tartinades dessinées sur la tartine (`TOPPINGS` dans `sprites.js`) : confiture, pâte à tartiner, miel et son abeille, ketchup en zigzag, dentifrice rayé, œuf au plat, sardine entière, slime qui a un œil, pâtée pour chien tartinée avec son odeur et sa mouche. Beurre au départ. 1 attaque sur 40 a un couteau garni : le frôler ou se faire tuer par lui débloque sa garniture (pas en entraînement). Choix sur l'accueil avec les flèches autour de la tartine, qui n'apparaissent qu'à la première garniture gagnée. Gardées sur le téléphone (`cv-garnitures`, `cv-garniture`), purement visuel.
- Fin de partie : « Encore 1,21 s pour passer X », X étant le joueur juste devant (soirée pendant une soirée, général sinon). Rien si tu es 1er, sans pseudo ou au-delà du 1 000e du général.
- Entraînement : bouton « S'entraîner » sur chaque attaque d'Infos. Seulement cette attaque, à la vitesse de son heure d'arrivée. Ne compte ni au classement, ni pour les succès, ni pour le record.

## Attaques

| Attaque | Dès | À retenir |
|---|---|---|
| Couteau visé | 0 s | Vise la tartine au moment de l'annonce. Tourne 1 fois sur 3 dès 35 s |
| Pluie de fourchettes | 4 s | 3 fourchettes, 1 de plus toutes les 12 s (8 au plus) |
| Hachoir | 8 s | Tombe très vite au-dessus de la tartine, annonce longue (0,9 s). 2 à la suite dès 30 s, 3 dès 55 s, dans des colonnes voisines |
| Mur | 14 s | Rangée serrée avec un seul trou d'environ 100 px |
| Rouleau | 18 s | Traverse lentement par un côté. 2 à la suite dès 36 s, 3 dès 60 s |
| Éventail | 24 s | 4 couteaux en cône vers la tartine, 5 dès 54 s |
| Croix | 32 s | 4 couteaux en même temps vers la tartine |
| Murs en série | 36 s | 2 murs d'affilée du même côté ou du haut (3 dès 60 s), trous d'environ 120 px. Chaque mur n'est annoncé que juste avant d'arriver. Joue seul |
| Couteau à pain | 38 s | Rebondit une fois sur un bord |
| Couloir | 46 s | Deux murs décalés, chacun avec son trou |
| Double pluie | 54 s | 5 à 9 fourchettes, à gauche et à droite en alternance |

- Vitesse des couverts : × (1 + t / 50), plafond × 2,6 à 80 s. Délai entre deux attaques : 1,25 s moins 0,016 × t, 0,42 s au plus court (dès 52 s).
- Jamais plus de 3 fois la même attaque d'affilée. Croix, murs en série, couloir et double pluie ne sortent jamais deux fois de suite. Les murs en série ne partent que si aucune annonce n'est en cours, et laissent un long répit derrière eux.
- Environ 1 attaque sur 40 a un couteau garni (voir Garnitures).
- Fouet mis de côté (jugé trop facile) : `lab: true` dans `attacks.js` et `projectiles.js`, visible seulement dans l'admin. Enlever `lab` pour le remettre.
- Chances, vitesses et délais de chaque attaque : `attacks.js`. Le calendrier est dans le jeu (Infos, onglet Attaques).
- Mesure du 28/10/2026 avec un robot « humain » (réaction 0,25 s, 320 px/s) : survie médiane 31 s, maximum 89 s. Faite avant les réglages du 29/10 (hachoirs et rouleaux multiples, murs en série, éventail réduit).

## Équité

- Avant chaque attaque, le solveur simule les 3,5 s suivantes (jusqu'à 4,5 s si l'attaque dure plus longtemps, comme les murs en série) avec tout ce qui est en vol. S'il ne trouve pas de chemin pour la tartine, en comptant 0,1 s de réaction, l'attaque est remplacée (5 essais au plus).
- Le modèle est prudent (grille de 12 px, doigt à 360 px/s au plus, marge de 11 px autour des couverts) : si le robot passe, un humain peut passer.
- `npm test` fait jouer le robot 100 parties de 150 s : 0 mort attendu. À relancer après chaque changement du jeu.

## Soirées et classements

- Pas de compte : le téléphone garde un jeton et son profil pour toujours. Le même téléphone qui retape son pseudo retrouve son compte.
- Pseudo unique sur tout le jeu, de 2 à 16 caractères : lettres latines (accents permis), chiffres, espaces, tirets. Majuscules et accents ne comptent pas pour l'unicité. Il se change dans Paramètres, record et place suivent.
- Deux classements : celui de la soirée (pour le lot) et le général, permanent. À égalité, le premier à avoir fait le temps passe devant.
- Écran Classement : les 10 premiers, podium or, argent et bronze, puis ta place exacte si tu n'es pas dedans. Jamais de défilement : sur un petit écran, on enlève des lignes par le bas (3 au moins).
- Une seule soirée à la fois, créée à l'avance dans l'admin pour être annoncée dans le jeu.
- Les téléphones relisent le classement toutes les 10 s (30 s sur l'accueil), et plus du tout écran éteint. Le serveur le garde 10 s en mémoire, le général 60 s pendant une soirée : jusqu'à 20 s de retard (70 s pour le général). Ta place après une partie est à jour tout de suite.
- En base : `profiles` (joueurs et record général), `entries` (record par soirée), `runs` (parties), `events` (soirées).

## Triche et sécurité

- Le serveur refuse un score plus long que le temps réellement écoulé (5 s de marge) ou au-delà de 15 min. Un score renvoyé deux fois ne compte qu'une fois.
- Signalés dans l'admin : record de 90 s ou plus, et partie ralentie (plus de 15 % et 15 s de temps réel en trop).
- Faille connue : un faux score plausible (vers 60 s) passe inaperçu. Parade possible : rejouer la partie à partir des gestes (voir « À faire »).
- Jetons des joueurs, identifiants des téléphones, connexions et invitations admin : rangés hachés (SHA-256). Une copie de la base ne permet pas de se faire passer pour quelqu'un.
- Limites : 150 inscriptions par minute et par adresse IP (tout le lieu partage souvent la même sur le wifi), 30 tentatives admin par minute et par adresse IP (clé comprise), 10 débuts de partie par 10 s et 5 changements de pseudo par minute, par joueur.
- En-têtes de sécurité (`public/_headers`) : pas de script externe, pas d'affichage dans le cadre d'un autre site.

## Admin

- Accès : Paramètres, onglet Admin, sur un téléphone connecté. Ou `/admin`, ou 5 appuis rapides sur « Collectif Tartine Sauvage ».
- Premier accès avec la clé admin (`cle-admin.txt`) : elle crée un compte propriétaire et reste la clé de secours.
- Le propriétaire invite : prénom et rôle, puis un lien à usage unique valable 48 h. Dans l'appli installée, on colle le lien dans « Lien d'invitation reçu ».
- Rôles : propriétaire (soirées, joueurs, équipe) et admin (soirées, joueurs). Chaque téléphone connecté peut être retiré, sauf le dernier propriétaire.
- Tableau de bord : soirée (créer, renommer, changer début et fin), classements soirée et général, bandeau rouge des records à vérifier, « Retirer » un joueur de tous les classements, écoute des bruitages.

## Écran géant

- `/ecran`, en paysage : top 10 de la soirée (du général hors soirée) à gauche, QR code et nombre de joueurs à droite.
- En haut : compte à rebours de fin ou de début, ou « Bravo X ! » après la soirée.
- Fil en direct : nouveaux records et nouveaux pseudos des 15 dernières minutes (`GET /api/feed`).
- Panneau « Nouveau n°1 » en grand pendant 6 s quand le 1er change.
- « Plein écran » empêche la mise en veille. La page se recharge seule après une mise en ligne.

## Son

- Musique : `public/music/theme.m4a` (ou `.mp3`), hors git pour les droits et le poids : à remettre avant de déployer depuis un autre PC. En prod : « Roundabout » de Blacklolita, en attendant les morceaux des collègues. Demander l'accord de l'artiste avant une diffusion plus large.
- Elle ne joue qu'en partie et repart du début à chaque partie, pour suivre la montée de la difficulté.
- Coupée et en boucle : elle joue jusqu'à 83,1 s (la voix finit de retomber), saute à la montée de 131,9 s qui mène au second passage énergique, puis reboucle sur la montée après 208,7 s. Coupes calées sur le tempo (172 BPM) et les débuts de mesure, déclenchées par la position réelle de la musique (`MUSIC_PARTS` dans `audio.js`). Approximatives en attendant une version montée par un DJ.
- À la mort, elle passe « sous l'eau » puis s'éteint (2,5 s). Elle passe pour ça par Web Audio sur tous les téléphones.
- Changer de musique : remplacer le fichier, mettre à jour `MUSIC_CREDIT` et `MUSIC_PARTS` (`[[0, durée]]` pour tout jouer en boucle) dans `audio.js`, puis `npm run deploy`.
- Bruitages Mixkit dans `public/sfx/` (départ, frôlé, mort, record, 1re place). Licence gratuite d'après la FAQ Mixkit, texte officiel à relire avant une diffusion hors soirée. Changer : remplacer le fichier, ou une ligne dans `SOUNDS` (`audio.js`).
- Volumes Musique et Bruitages dans Paramètres. Sur iPhone, le bouton silencieux coupe les bruitages, pas la musique (règle d'Apple).
- Pas de son sur les annonces d'attaque : ça avantagerait ceux qui jouent avec le son.

## Succès

- 22 succès en 4 familles (temps, frôlés et découvertes, assiduité et soirées, secrets) : liste et conditions dans `achievements.js`.
- Gardés sur le téléphone (`cv-succes`), sans effet sur le classement. Perdus en changeant de téléphone ou de navigateur. Sur iPhone, Safari et l'appli installée ne partagent pas leurs succès.
- Le nombre de parties prend le plus grand entre le compteur du téléphone et celui du serveur.

## Appli et réseau

- Installable : bouton Installer sur Android, Partager puis « Sur l'écran d'accueil » sur iPhone. Le jeu s'ouvre sans réseau s'il a déjà été ouvert une fois.
- Chaque `npm run deploy` crée une version. Le jeu se recharge seul quand elle change, jamais en pleine partie. Le serveur refuse l'inscription et le début de partie d'une ancienne version.
- Une partie ne compte que si le réseau passe au départ. À la fin, l'envoi du score réessaie pendant 2 min (« Envoi en attente… »), même si on ferme le jeu.

## Check-list d'une soirée

Avant :

- Admin, « Nouvelle soirée » : nom, début et fin. On peut la créer plusieurs jours avant.
- Imprimer le QR code, puis faire une partie depuis le QR code.
- Si le lieu a un écran : `/ecran`, puis « Plein écran ».

Pendant :

- Surveiller le bandeau rouge « à vérifier » et retirer le joueur si besoin.
- Repousser la fin si la soirée glisse.
- Ne rien mettre en ligne : le script refuse tant que la soirée est ouverte.

Après :

- Le gagnant montre son téléphone au bar : sa ligne est en jaune.
- Regarder la consommation : tableau de bord Cloudflare, D1, onglet Metrics, « Rows read ».

## Technique

- Cloudflare, offre gratuite (0 €), compte d'Adrien : Workers pour le site et l'API, base D1 (SQLite) en Europe de l'Ouest. Jeu en JavaScript sans compilation, API en TypeScript.
- Limites gratuites par jour : 100 000 requêtes, 5 millions de lignes lues, 100 000 lignes écrites. Au-delà, l'API est en erreur jusqu'à 1 h du matin.
- Pour les tenir : chaque requête passe par un index, le classement est gardé en mémoire et mis à jour sur place à chaque record, rien n'est demandé écran éteint. Estimation pour 150 joueurs sur 5 h : au plus 45 000 requêtes, 20 000 à 35 000 lignes écrites, 1 à 2 millions de lignes lues (2,5 millions quand le général aura 1 000 joueurs). Ce sont des estimations, pas des mesures.
- Général : les 1 000 premiers en mémoire. Au-delà, la place se calcule en comptant les joueurs devant.
- Journaux d'erreurs : gardés 3 jours dans Cloudflare, page du Worker `croute-que-croute`. En direct : `npx wrangler tail`.
- Non retenus : un cache partagé entre les copies du serveur (Durable Object, dont le quota gratuit est à peu près ce qu'une soirée consomme) et une lecture partagée entre deux demandes (risque d'erreurs côté Cloudflare, gain faible).
- Git : une branche par changement, fusionnée dans `master` avec `--no-ff`, puis poussée sur GitHub.

| Dossier | Rôle |
|---|---|
| `public/js/game/` | Le jeu sans affichage (terrain, armes, attaques, solveur, boucle), partagé avec les tests |
| `public/js/app/` | Le jeu dans le navigateur : `main.js` (états et boucle), dessin, son, écrans, succès, appels au serveur |
| `public/js/admin/`, `public/js/ecran/` | Tableau de bord admin, écran géant |
| `public/js/shared/` | Stockage du téléphone, formats, couleurs (`palette.js`) |
| `public/sw.js`, `manifest.webmanifest` | Appli installable |
| `src/` | API : routes (`routes/`, liste dans `worker.ts`), base et cache (`db.ts`), sécurité et contrôles |
| `migrations/` | Schéma de la base |
| `scripts/` | Mise en ligne, icônes, QR codes |
| `test/` | Robot d'équité, tests de l'API |
| `maquettes/` | Images de travail : pistes de redesign de la tartine (pas retenues), planche des garnitures |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire après une migration) |
| `npm run dev` | Jeu en local sur http://localhost:8787, clé admin dans `.dev.vars` |
| `npm test` | Robot d'équité, 0 mort attendu (environ 4 min) |
| `npm run test:api` | Tests de l'API, avec `npm run dev` lancé |
| `npm run check` | Vérifier les types de l'API |
| `npm run db:remote` | Appliquer les migrations en ligne, avant `npm run deploy` |
| `npm run deploy` | Mettre en ligne. Refuse si git n'est pas à jour, si une migration manque en ligne ou si une soirée est ouverte (`npm run deploy -- --pendant-soiree` en urgence) |
| `npm run icons`, `npm run qr` | Regénérer les icônes et les QR codes |

## Ajouter du contenu

- Attaque : une fonction dans `attacks.js` et une ligne dans `ATTACKS` (dès quand, poids, durée ; `solo: true` pour une grosse figure, `calm: true` pour qu'elle ne parte que sans annonce en cours, `growsUntil` et `growth` si elle grossit avec le temps). `notice` sur une annonce ne l'affiche que peu avant son arrivée. Le solveur la vérifie tout seul.
- Arme : sa taille dans `projectiles.js` et son dessin dans `sprites.js`, sous le même nom.
- Prototype : `lab: true` dans `ATTACKS` ou `PROJECTILES`. Visible dans Infos pour les admins seulement, jamais tiré en jeu.
- Tartinade rare : une ligne dans `SPREADS` (`palette.js`, avec `with` pour « par un couteau au… ») et son nom dans `RARE_SPREADS` (`projectiles.js`). Elle devient aussi une garniture à débloquer.
- Événement de partie : `sim.js` le renvoie dans les événements de `step`, `main.js` y réagit dans `ON_SIM`.
- Succès : une ligne dans `ACHIEVEMENTS` et sa condition dans `runTick`, `runEnd`, `afterSubmit` ou `onBoard`.
- Route d'API : une fonction dans `src/routes/` et une ligne dans `src/worker.ts`, avec son niveau d'accès.

## À faire

- Adresse : garder « workers.dev » ou prendre un nom de domaine payant (le QR code changerait). Décision à l'AG du lundi 02/11/2026 à 20h, avant d'imprimer les affiches.
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Faire monter le morceau par un ami DJ : coupes et transitions propres, fin qui boucle. Les coupes faites dans le code en attendant sont approximatives.
- Reprendre les couleurs des affiches : fichiers du designer dans `affiches/`. Les affiches sont aplaties : demander les éléments séparés.
- À décider : rejouer les meilleures parties pour confirmer leur temps (graine donnée par le serveur, gestes enregistrés). Bloquerait la triche par faux score.

## Idées pour plus tard

- Vibration au frôlé, succès gardés sur le serveur.
- Dernier quart d'heure : 15 min avant la fermeture, l'accueil et l'écran géant passent en rouge, compte à rebours en grand.
- Compteur de la salle sur l'écran géant : temps cumulé de toutes les parties de la soirée. Une ligne écrite en plus par partie.
- Nouvelles attaques vers 65 s, pour que les meilleurs découvrent encore quelque chose (la dernière arrive à 54 s) : cuillère boomerang qui traverse puis revient, pince de deux couteaux qui se referment, spirale de fourchettes.
- Même partie pour tous : une seule suite d'attaques par soirée, identique pour tout le monde. La plus tryhard, mais elle change l'esprit du classement.
- Une phase après 80 s (« mode sérieux »), ou des moments calmes et des pics calés sur les drops du morceau.
- Suites d'attaques calées sur la musique, ou tirées parmi des enchaînements déjà écrits qui reviennent : analyser d'abord le morceau pour caler au moins les montées et les drops.
- Images ou objets à collectionner (le maximator qui tourne), partage du score en story Insta.
- Montrer les fonctionnalités petit à petit, pour ne pas surcharger les premières parties. Déjà fait pour les garnitures (flèches cachées tant qu'aucune n'est gagnée), à étendre au reste (succès, classement de soirée, infos).
- Accessoires sur la tartine : petit chapeau de Noël, un truc d'Halloween, deuxième paire de boosters sur les côtés comme sur l'affiche. Moyen de les débloquer à trouver.
- Pas retenues pour l'instant : thème de soirée choisi par l'admin, tartine du designer ou redessinée (Adrien garde la tartine actuelle, pistes dans `maquettes/`), étoiles au rythme de la musique, son d'annonce par attaque, couche de tension, podium de fin de soirée sur l'écran géant.

## Bon à savoir

- Hors git, à garder de côté : `cle-admin.txt`, `.dev.vars`, `invitation-*.txt`, `sauvegardes/`, la musique, `ecoute-sons/` (écoute des bruitages candidats : `node ecoute-sons/serve.mjs`).
- Sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`. Celles d'avant le 29/10/2026 contiennent des jetons en clair : à garder pour soi.
- Retour en arrière sans sauvegarde, à n'importe quel moment des 7 derniers jours (Time Travel, gratuit) : `npx wrangler d1 time-travel restore croute-que-croute --timestamp=<heure unix>`. Ça écrase la base en ligne : sauvegarder d'abord.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami`).
- Base vidée le 29/10/2026 au changement d'adresse : chaque téléphone est reparti de zéro.
