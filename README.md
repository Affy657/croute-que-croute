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
- Rien n'arrive par le bas (le doigt cacherait les attaques). Les attaques de côté partent des 60 % du haut.
- Chaque attaque est annoncée 0,45 à 0,9 s avant par une pastille au bord de l'écran, jamais posée sur le chrono.
- La difficulté monte jusqu'à 80 s, puis plus rien ne change.
- Zones de touche : la tartine est un cercle de 26 px, chaque arme est faite de gélules (`parts` dans `projectiles.js`). « Frôlé » quand la tartine passe à moins de 11 px.

## Attaques

| Attaque | Dès | À retenir |
|---|---|---|
| Couteau visé | 0 s | Vise la tartine au moment de l'annonce. Tourne 1 fois sur 3 dès 35 s |
| Pluie de fourchettes | 6 s | 4 fourchettes, 1 de plus toutes les 15 s (8 au plus) |
| Hachoir | 10 s | Tombe très vite au-dessus de la tartine, annonce longue (0,9 s) |
| Mur | 14 s | Rangée serrée avec un seul trou d'environ 100 px |
| Rouleau | 18 s | Traverse lentement par un côté |
| Éventail | 24 s | 5 couteaux en cône vers la tartine (6 à 44 s, 7 à 64 s) |
| Fouet | 28 s | Tourne et descend lentement vers la tartine |
| Croix | 32 s | 4 couteaux en même temps vers la tartine |
| Couteau à pain | 38 s | Rebondit une fois sur un bord |
| Couloir | 46 s | Deux murs décalés, chacun avec son trou |
| Double pluie | 54 s | 5 à 9 fourchettes, à gauche et à droite en alternance |

- Vitesse des couverts : × (1 + t / 50), plafond × 2,6 à 80 s. Délai entre deux attaques : 1,25 s moins 0,016 × t, 0,42 s au plus court (dès 52 s).
- Jamais plus de 3 fois la même attaque d'affilée. Croix, couloir et double pluie ne sortent jamais deux fois de suite.
- Environ 1 attaque sur 40 a un couteau à une tartinade rare (confiture, pâte à tartiner, miel, ketchup) : pur visuel.
- Chances, vitesses et délais de chaque attaque : `attacks.js`. Le calendrier est dans le jeu (Infos, onglet Attaques).
- Mesure du 28/10/2026 avec un robot « humain » (réaction 0,25 s, 320 px/s) : survie médiane 31 s, maximum 89 s.

## Équité

- Avant chaque attaque, le solveur simule les 3,5 s suivantes avec tout ce qui est en vol. S'il ne trouve pas de chemin pour la tartine, en comptant 0,1 s de réaction, l'attaque est remplacée (5 essais au plus).
- Le modèle est prudent (grille de 12 px, doigt à 360 px/s au plus, marge de 11 px autour des couverts) : si le robot passe, un humain peut passer.
- `npm test` fait jouer le robot 100 parties de 150 s : 0 mort attendu. À relancer après chaque changement du jeu.

## Soirées et classements

- Pas de compte : le téléphone garde un jeton et son profil pour toujours. Le même téléphone qui retape son pseudo retrouve son compte.
- Pseudo unique sur tout le jeu, de 2 à 16 caractères : lettres latines (accents permis), chiffres, espaces, tirets. Majuscules et accents ne comptent pas pour l'unicité. Il se change dans Paramètres, record et place suivent.
- Deux classements : celui de la soirée (pour le lot) et le général, permanent. À égalité, le premier à avoir fait le temps passe devant.
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
- « Plein écran » empêche la mise en veille. La page se recharge seule après une mise en ligne.

## Son

- Musique : `public/music/theme.m4a` (ou `.mp3`), hors git pour les droits et le poids : à remettre avant de déployer depuis un autre PC. En prod : « Roundabout » de Blacklolita, en attendant les morceaux des collègues. Demander l'accord de l'artiste avant une diffusion plus large.
- Elle ne joue qu'en partie et repart du début à chaque partie, pour suivre la montée de la difficulté.
- Changer de musique : remplacer le fichier, mettre à jour `MUSIC_CREDIT` dans `audio.js`, puis `npm run deploy`.
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

- Attaque : une fonction dans `attacks.js` et une ligne dans `ATTACKS` (dès quand, poids, durée ; `solo: true` pour une grosse figure, `growsUntil` et `growth` si elle grossit avec le temps). Le solveur la vérifie tout seul.
- Arme : sa taille dans `projectiles.js` et son dessin dans `sprites.js`, sous le même nom.
- Prototype : `lab: true` dans `ATTACKS` ou `PROJECTILES`. Visible dans Infos pour les admins seulement, jamais tiré en jeu.
- Tartinade rare : une ligne dans `SPREADS` (`palette.js`) et son nom dans `RARE_SPREADS` (`projectiles.js`).
- Événement de partie : `sim.js` le renvoie dans les événements de `step`, `main.js` y réagit dans `ON_SIM`.
- Succès : une ligne dans `ACHIEVEMENTS` et sa condition dans `runTick`, `runEnd`, `afterSubmit` ou `onBoard`.
- Route d'API : une fonction dans `src/routes/` et une ligne dans `src/worker.ts`, avec son niveau d'accès.

## À faire

- Créer la soirée du samedi 07/11 dans l'admin.
- Tester sur de vrais téléphones : fluidité, son, réseau du lieu.
- Inviter les collègues admins.
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Reprendre les couleurs et la tartine des affiches : fichiers du designer dans `affiches/`. Les affiches sont aplaties : demander les éléments séparés, comme la tartine (`tartine-fusee.webp`).
- À décider : rejouer les meilleures parties pour confirmer leur temps (graine donnée par le serveur, gestes enregistrés). Bloquerait la triche par faux score.

## En essai

Onze idées codées sur la branche `essais`, en ligne mais pas encore sur `master`, une fusion par idée (`rival`, `frole-serie`, `entrainement`, `paliers`, `trainees`, `musique-etouffee`, `nouveau-n1`, `ciel-chaud`, `cicatrices`, `reglages-difficulte`, `murs-serie`). Adrien choisit lesquelles garder. Les autres sont retirées (`git revert -m 1` de leur fusion), puis `essais` est fusionnée dans `master` et ces lignes rangées dans les bonnes parties.

- Rival : « Encore 1,21 s pour passer X » en fin de partie, X étant le joueur juste au-dessus (soirée pendant une soirée, général sinon). Rien si tu es 1er ou sans pseudo, et pas au-delà du 1 000e du général. Envoyé par le serveur dans `rival` et `eventRival`.
- Série de frôlés : « Frôlé x2 », « Frôlé x3 »… quand ils s'enchaînent à moins de 1,5 s, avec un son plus aigu à chaque cran (6 au plus). Aucun effet sur le score.
- Entraînement : bouton « S'entraîner » sur chaque attaque d'Infos. Seulement cette attaque, à la vitesse de son heure d'arrivée. Ne compte ni au classement, ni pour les succès, ni pour le record.
- Paliers : le chrono flashe en jaune à 10, 20, 30 s…
- Traînées : un trait derrière les couverts rapides, dès 380 px/s et 90 px au plus (`drawTrail` dans `sprites.js`).
- Musique étouffée à la mort : elle passe « sous l'eau » puis s'éteint (2,5 s en tout). La musique passe pour ça par Web Audio sur tous les téléphones. À écouter sur Android et iPhone.
- Écran géant : panneau « Nouveau n°1 » en grand pendant 6 s quand le 1er change.
- Ciel qui chauffe : le fond passe du bleu nuit au violet vers 40 s, puis au rouge sombre à 80 s, au rythme de la vitesse des couverts. Il redevient bleu à l'accueil et au départ d'une partie (`HEAT` dans `palette.js`).
- Cicatrices : chaque frôlé laisse une entaille dans la croûte, du côté où le couvert est passé, jusqu'à la fin de la partie (12 au plus). Aucun effet sur la zone de touche.
- Réglages de difficulté : couteau visé moins fréquent (poids 2 au lieu de 3), éventail de 4 couteaux puis 5 dès 54 s (au lieu de 5 à 7), 2 hachoirs à la suite dès 30 s puis 3 dès 55 s, 2 rouleaux à la suite dès 36 s puis 3 dès 60 s.
- Murs en série : dès 36 s, 2 murs d'affilée (3 dès 60 s), toujours du même côté ou du haut, chacun avec son trou. Chaque mur après le premier n'est annoncé que 0,7 s avant d'arriver (champ `notice` d'une annonce), pour que les pastilles ne se superposent pas.

## Idées pour plus tard

- « Tartinée par… » avec l'arme qui t'a eu, vibration au frôlé, succès gardés sur le serveur.
- Arrêt sur image à la mort : le jeu se fige 0,3 s avec un léger zoom sur le couvert qui t'a eu, puis l'éclaboussure. Va avec « Tartinée par… ».
- Dernier quart d'heure : 15 min avant la fermeture, l'accueil et l'écran géant passent en rouge, compte à rebours en grand.
- Compteur de la salle sur l'écran géant : temps cumulé de toutes les parties de la soirée. Une ligne écrite en plus par partie.
- Nouvelles attaques vers 65 s, pour que les meilleurs découvrent encore quelque chose (la dernière arrive à 54 s) : cuillère boomerang qui traverse puis revient, pince de deux couteaux qui se referment, spirale de fourchettes.
- Tartines à débloquer : une tartinade sur la tartine par succès, purement visuelle.
- Même partie pour tous : une seule suite d'attaques par soirée, identique pour tout le monde. La plus tryhard, mais elle change l'esprit du classement.
- Une phase après 80 s (« mode sérieux »), ou des moments calmes et des pics calés sur les drops du morceau.
- Images ou objets à collectionner (le maximator qui tourne), partage du score en story Insta.
- Adresse sans « workers.dev » : nom de domaine payant, et le QR code changerait. À décider avant d'imprimer les affiches.
- Pas retenues pour l'instant : thème de soirée choisi par l'admin, tartine du designer à la place de la tartine dessinée, étoiles au rythme de la musique, son d'annonce par attaque, couche de tension, podium de fin de soirée sur l'écran géant.

## Bon à savoir

- Hors git, à garder de côté : `cle-admin.txt`, `.dev.vars`, `invitation-*.txt`, `sauvegardes/`, la musique, `ecoute-sons/` (écoute des bruitages candidats : `node ecoute-sons/serve.mjs`).
- Sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`. Celles d'avant le 29/10/2026 contiennent des jetons en clair : à garder pour soi.
- Retour en arrière sans sauvegarde, à n'importe quel moment des 7 derniers jours (Time Travel, gratuit) : `npx wrangler d1 time-travel restore croute-que-croute --timestamp=<heure unix>`. Ça écrase la base en ligne : sauvegarder d'abord.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami`).
- Base vidée le 29/10/2026 au changement d'adresse : chaque téléphone est reparti de zéro.
