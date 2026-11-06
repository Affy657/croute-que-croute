# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, et le meilleur temps de la soirée gagne une conso.

<img src="maquettes/accueil.jpg" alt="Accueil du jeu sur téléphone" width="260">

Serveur en TypeScript sur Cloudflare Workers, D1 et Durable Objects. Jeu en JavaScript sans compilation, dessiné sur canvas, installable comme une appli. Avant chaque attaque, un solveur vérifie qu'il reste un chemin pour s'en sortir.

Source unique de connaissance du projet. Si le README et le code se contredisent, le code a raison.

## Liens

- Jeu : https://croute-que-croute.tartinesauvage.fr
- Ancienne adresse, encore en ligne pour les applis installées : https://croute-que-croute.tartine-sauvage.workers.dev
- Admin : `/admin`
- Écran géant : `/ecran`, sur l'ordinateur branché à l'écran
- Code : https://github.com/Affy657/croute-que-croute
- QR codes : `qr/` (`.png` pour imprimer, `.svg` pour une affiche, version `-simple` en secours). Régénérer : `npm run qr`, ou `npm run qr -- <adresse>`. À scanner sur plusieurs téléphones avant d'imprimer.

## Lancer le jeu en local

Il faut Node 26.

1. `npm ci`
2. Créer un fichier `.dev.vars` avec la ligne `ADMIN_KEY=cledetest` (lettres et chiffres seulement).
3. `npm run db:local`, puis `npm run seed` pour des joueurs d'essai.
4. `npm run dev` : le jeu tourne sur http://localhost:8787.

La musique et les bruitages ne sont pas dans le dépôt, le jeu marche sans.

## Le jeu

### Une partie

- QR code, pseudo, autant de parties qu'on veut. Sans pseudo, la partie ne compte pas au classement.
- Rien n'arrive par le bas : le doigt cacherait les attaques. Les attaques de côté partent des 60 % du haut.
- Chaque attaque est annoncée 0,45 à 0,9 s avant par une pastille au bord de l'écran, jamais sur le chrono.
- Rythme plafonné à 80 s, vitesse à 150 s : plafond bas, au-delà c'est l'endurance qui départage.
- Tartine : cercle de 26 px. Armes en gélules (`parts` dans `projectiles.js`), manche de fourchette de 8 px, calé sur le dessin.
- Frôlé : moins de 11 px. « Frôlé x2 », « x3 »… à moins de 1,5 s d'écart, son plus aigu à chaque cran (6 au plus), une entaille dans la croûte (12 au plus). Aucun effet sur le score ni la zone de touche.
- Mort : gel de 0,3 s, puis « Tartinée ! » et l'arme (`by`, `with`).
- Fin : « Encore 1,21 s pour passer X », le joueur juste devant (soirée, sinon général). Rien si 1er, sans pseudo ou après le 1 000e.
- Entraînement : « S'entraîner » sur chaque attaque d'Infos. Démarre à la vitesse de son heure d'arrivée, respecte `shuns` (2 rouleaux au plus), et chaque double pluie attend la précédente à mi-chemin. Ne compte nulle part.

### Commandes

- Doigt : partout, la tartine suit à 1,8 fois le mouvement pour ne pas être cachée. « Sensibilité » de 0,8 à 2,8.
- Souris : « Glisser » (comme le doigt) ou « Viser » (la tartine va où pointe la souris, curseur caché). Sortir de la fenêtre ne fait pas sauter la tartine.
- Espace ou Entrée lance une partie depuis l'accueil et l'écran de fin, même après un clic sur un bouton (il rend le focus). Sur Infos, Espace ne relance pas l'entraînement.
- Échap : « Retour » partout, ferme les skins et la proposition d'installer. Rien dans un champ, et le garder appuyé ne remonte qu'une page. Marche après un curseur et dans l'onglet Admin (`relayEscape`).

### Le ciel

- 14 planètes (`BODIES` dans `planets.js`, dessins dans `sky/`) : normales, extravagantes, drôles (`BODIES.rare`).
- Tours de huit places (`TOUR`) : cinq normales, deux extravagantes, une drôle. Trois normales avant la première extravagante : plus tôt, les joueurs trouvaient ça trop fréquent.
- On revoit une planète après avoir vu toutes les autres de sa catégorie.
- Planètes à accessoire (grille-pain, citrouille, pirate, œuf, `key`) : un tour sur 5 (`SKIN_ODDS`), soit environ toutes les 13 min de ciel, une planète donnée toutes les 50 min. Les toucher sur l'accueil donne un succès secret.
- Étoiles filantes (`PASSERS`, `COMET_*`) : première entre 30 s et 3 min, puis toutes les 2 à 4 min, menu compris, en 9 s, dans un ordre au hasard.
- Canettes : photos de magasin délavées, vérifier les couleurs sur l'image seule. Sans contour et opaques, pour ne pas ressembler à une arme.
- Droits : pas de personnages ni de designs protégés (films, mangas, jeux vidéo). Idées originales, œuvres libres de droits ou objets réels.

### Skins

- Garnitures : 10 à gagner (`SPREADS`), Beurre et Nature gratuites (`free`). 1 attaque à couteaux sur 10 a un couteau garni, tiré dans tout `SPREADS` (une liste à part avait oublié la sauce du chef). Le frôler ou mourir dessus la débloque, pas en entraînement.
- Tenue : chapeau, côtés, pain, aura (`GEAR` dans `palette.js`). Chaque objet récompense un succès qui a un lien avec lui (`gear` dans `achievements.js`).
- Pains : seules les couleurs changent, même zone de touche. Hitbox : tartine ronde qui remplit pile la zone de touche (`HIT_R`).
- Mains Six Seven : chiffres dessinés à la main, la police faisait du 7 un « ? ».
- Auras : purement visuelles, dessinées avant les couverts pour n'en cacher aucun. Seule la moitié avant de l'anneau repasse sur la tartine, là où la tenue cache déjà les couverts.
- Un skin gagné est mis tout de suite, même en partie. Visuel seulement, gardé sur le téléphone.
- Condition d'un objet changée : ceux qui l'avaient gagné autrement le perdent jusqu'à remplir la nouvelle.

### Infos

- Textes pour des joueurs : tutoiement, phrases courtes, « hitbox », « skin », « max ».
- Onglets et curseurs d'au moins 44 px de haut, la taille minimale pour un doigt. Boutons de Paramètres : 14 px au plus petit (`6cqi`).

## Attaques

| Attaque | Dès | À retenir |
|---|---|---|
| Couteau visé | 0 s | Vise la tartine à l'annonce. Tourne 1 fois sur 3 dès 25 s |
| Pluie de fourchettes | 3 s | 4 fourchettes, 1 de plus toutes les 15 s (8 dès 60 s) |
| Hachoir | 8 s | Très rapide, annonce longue (0,9 s). 2 dès 30 s, 3 dès 55 s, colonnes voisines |
| Mur | 12 s | Rangée avec un seul trou. Par le haut, 1,3 fois plus rapide |
| Rouleau | 16 s | Aller-retour à n'importe quelle hauteur. 2 dès 36 s, à 200 px l'un de l'autre au moins |
| Éventail | 22 s | 3 couteaux en cône, 4 dès 38 s, 5 dès 54 s. Un toujours sur la tartine |
| Murs en série | 28 s | 2 murs du même côté ou du haut (3 dès 60 s). Chaque mur annoncé juste avant. Joue seul |
| Croix | 32 s | 4 couteaux en même temps vers la tartine |
| Couteau à pain | 38 s | Rebondit une fois sur un bord |
| Pluie en biais | 45 s | 7 à 8 fourchettes en diagonale, d'un côté à l'autre |
| Double pluie | 54 s | 8 fourchettes (9 dès 60 s), à gauche et à droite en alternance |

### Rythme

- Vitesse : × (1,4 + t / 75), × 3 à 120 s, plafond × 3,4 à 150 s (`field.js`).
- Délai : 0,95 s moins 0,005625 × t, 0,5 s au plus court dès 80 s (`GAP_*`), fois `cost` et un hasard de 0,85 à 1,15.

### Enchaînements

- Jamais plus de 3 fois la même attaque, sauf si c'est la seule possible (avant 3 s).
- Jamais deux fois de suite (`solo`) : hachoir, croix, double pluie, mur, murs en série. Un mur ne suit jamais des murs en série, ni l'inverse (`kin`).
- `shuns` : ni mur ni rouleau tant qu'un mur ou un rouleau est annoncé ou à l'écran. Un rouleau bouchait presque le trou d'un mur, et l'aller-retour pouvait en mettre 4 à l'écran.
- `avoids`, juste après :
  - pas de hachoir après une pluie, une croix ou un mur : il fallait traverser la pluie, et on reste coincé dans le trou d'un mur ;
  - pas de croix après un hachoir ou un mur : elle se refermait pendant qu'on dansait entre les hachoirs ;
  - pas de double pluie après une pluie droite ou en biais : deux rideaux ne laissaient presque plus de place ;
  - pluie en biais, couteau à pain et rouleau ne se suivent jamais (`BREATHERS`) : deux respirations donnaient 2 à 3 s gratuites.
- `waits` : après une double pluie ou un hachoir, ni pluie droite ni double pluie tant que le dernier objet n'est pas à mi-chemin (`WAIT_PASS`). La pluie en biais n'attend pas, mesurée sans effet.
- `wallSide` : juste après une pluie, mur et murs en série arrivent par un côté. Par le haut, pluie et mur arrivaient à 0,4 s d'écart.
- `holds` : mur ou murs en série tirés pendant une double pluie sont mis de côté jusqu'à ce que sa dernière fourchette quitte l'écran : il fallait rejoindre le trou à travers elles. Poids montés (mur 1,15, série 0,63) pour garder autant de murs.
- `calm` : les murs en série attendent la fin des annonces. L'attaque suivante part à 20 % de la traversée du dernier mur (`CALM_PASS`), soit environ 1 s sans nouvel objet. À 40 % ou à la sortie de l'écran, 1,2 à 2 s de vide : trop long.

### Murs et rouleaux

- Trou : 144 px d'un couvert à l'autre (`WALL_HOLE`), environ 105 px de passage, pour tous les murs. Le mur se construit du trou vers les bords : sur une grille fixe, le trou sautait d'une case.
- Trou à au moins 90 px de la tartine (`WALL_AWAY`), pour un mur seul et le premier d'une série : 1 fois sur 4, il tombait sur elle et il n'y avait rien à faire.
- Par un côté, trou jusqu'à 430 px de haut (`WALL_LOW`), pas plus bas : à une main, la paume cache le bas de l'écran. Dans la seule moitié haute, un joueur resté en bas devait remonter de 300 px.
- Murs en série : trou décalé de 90 à 140 px (`SERIES_MOVE`, `SERIES_SHIFT`). Presque aligné, trop facile. Sans limite, il sautait d'un bord à l'autre : 27 morts pour 100 séries chez un débutant. Mesuré : 0 série refusée, 0 mort du robot parfait.
- Mur seul par le haut 1,3 fois plus rapide (`TOP_WALL_RUSH`) : il laissait 2,5 à 3 s sur 360 px, contre 1,5 s sur 640 px par un côté.
- Rouleau : dans la seule moitié haute, un joueur resté en bas n'avait jamais à l'esquiver. 2 rouleaux à 200 px au moins (`ROLLING_APART`), collés c'était trop gênant.
- Éventail pair : cône décalé d'un demi-écart pour viser la tartine. Sinon, ne pas bouger suffisait 98 fois sur 100.
- Fouet (trop facile) et couloir (trop proche des murs en série, on pouvait le prendre pour un bug) : `lab: true`, visibles seulement dans l'admin. Enlever `lab` pour les remettre.

## Équité

- Avant chaque attaque, le solveur simule les 3,5 s suivantes (4,5 s pour une attaque longue) avec tout ce qui est en vol. Sans chemin pour la tartine, avec 0,1 s de réaction, l'attaque est remplacée (5 essais au plus).
- Modèle prudent (grille de 12 px, doigt à 360 px/s, 509 en diagonale, marge de 11 px) : si le robot passe, un humain peut passer.
- Zone balayée par chaque couvert calculée d'un coup sur 1/30 s, grille en lignes de 32 bits : 6 fois plus rapide que 5 instantanés par pas, mêmes décisions sur 8 853 vérifications enregistrées.
- Le chemin du robot vit dans `test/chemin.mjs`, hors du code envoyé aux téléphones.
- Trajet de la tartine vérifié tous les 6 px : un geste rapide ne traverse pas un couvert. Déplacement absurde (infini, plus de 10 000 px) borné pour ne pas figer le jeu.

### Ce que font vraiment les refus

Mesuré sur 38 132 vérifications de 360 parties simulées.

- Les 3 960 refus venaient tous de la situation en cours, jamais de la nouvelle attaque : la tartine est trop près d'un couvert, et le solveur la suppose immobile pendant la réaction.
- Les attaques sont saines grâce à leurs règles (`shuns`, `avoids`, `calm`, `WALL_AWAY`) : 3 échecs sur 38 012 attaques seules, tartine placée au hasard.
- L'effet réel est un petit répit, environ 0,7 s par partie. Le retirer coûte environ 20 s au niveau le plus fort (médiane de 150 à 130 s, chiffres bruités).
- Son revers, en théorie : rester 35 à 55 px devant un rouleau fait tomber les nouvelles attaques de 1,42 à 0,59 par seconde (tartine parfaitement calée, jamais vu en prod).
- Essayé sans gain : réaction de 0,2 ou 0,3 s, filtre sur la marge pour s'échapper (morts à peu près égales quelle que soit la marge), horizon plus long (0 échec sur 34 172 attaques acceptées).
- Temps mesuré : 0,22 ms en médiane, 1,76 ms au pire sur 8 635 vérifications rejouées.
- `npm run equite` : 100 parties de 150 s, 0 mort attendu, 0 refus « à cause de l'attaque elle-même » (option `audit`, coupée en vraie partie). Si ce chiffre monte, une attaque est vraiment impossible, et le jeu la remplace sans rien dire. À relancer après un gros changement des règles.

## Équilibrage

Le robot d'équité dit si le jeu est faisable, pas s'il est bien dosé. Pour le dosage, un robot « humain » joue une population de niveaux (`test/equilibrage/`).

### Le robot humain

- `playHuman` dans `jeu.mjs`. Il voit les annonces après son temps de réaction, va à vitesse limitée, a des inattentions de 0,4 s, et choisit son chemin avec le solveur.
- Niveau de 0 à 1 (`profileOf`) : réaction de 0,33 à 0,18 s, vitesse de 240 à 480 px/s, une inattention toutes les 6 à 20 s.
- Limites : il ne se fatigue pas, voit tout, son doigt ne cache rien. `ROBOT_Y=0.8` pour un robot qui se tient en bas, comme un joueur.
- Ses chiffres comparent deux versions, ils ne prédisent pas les temps réels. Le vrai repère, c'est le classement en prod.

### Les commandes

| Commande | Ce qu'elle mesure | Durée |
|---|---|---|
| `npm run equilibrage` | 80 joueurs, 5 parties, deux tirages : part du niveau, médianes, risque par tranche de 20 s | 10 min pour deux versions |
| `npm run equilibrage:attaques` | Morts pour 100 lancées, débutant (0,1), moyen (0,5), fort (0,9) | 10 min |
| `npm run equilibrage:vides` | Temps sans nouvel objet autour des murs en série | 1 min |
| `npm run equilibrage:combos` | Joueur moyen à 45 et 65 s : morts de chaque attaque, paire et suite de 3. « En trop » : en plus des attaques jouées séparément. `ATTAQUE=rolling` pour une seule (2 à 3 min) | 13 min |
| `npm run equilibrage:invariants` | Robots immobile, nerveux, collé aux bords, parfait : valeurs impossibles, règles de tirage, trous, couvert traversé. Aussi sur GitHub, en petit | 1 à 3 min |

### Lire les chiffres

- Part du niveau : part des écarts de temps qui vient du joueur (corrélation intra-classe sur le logarithme). Bouge d'environ 3 points entre deux tirages : un écart plus petit ne prouve rien.
- Plus faible bat plus fort : duels où un joueur plus faible d'au moins 0,2 niveau a un meilleur record sur 5 parties.
- Risque par tranche : chance de mourir dans ces 20 s pour un joueur moyen en vie. Montée brutale : un mur de difficulté. Ligne plate : le plafond.

### Tester un réglage

1. `npm run equilibrage:variante -- essai` copie le coeur du jeu dans `.equilibrage/essai` (hors git). Y changer les réglages.
2. `npm run equilibrage -- public/js/game .equilibrage/essai` compare. Les autres commandes : `GAME=.equilibrage/essai npm run equilibrage:attaques`.
3. Si c'est mieux, reporter dans `public/js/game`, puis `npm run equite` et `npm run equilibrage:invariants`.

- Ancienne version : copier ses 5 fichiers dans `.equilibrage/<nom>` (`git show <commit>:public/js/game/sim.js > .equilibrage/<nom>/sim.js`).
- Refaire un point de temps en temps, quand beaucoup de règles changent ou que la progression paraît mal dosée. Pas pour un petit réglage.

### Mesures et décisions

- Courbe : début trop calme, mur entre 40 et 60 s, puis un tiers des joueurs moyens tués par tranche de 20 s. Courbe actuelle : part du niveau de 41 à 47 %, plus faible bat plus fort de 5,4 à 3,4 %.
- Écartés : plafond doux à 80 s (plus de chance, 39 %), vitesse maximale plus haute (sans effet), plafond très bas à 60 s (instable), préavis de 0,9 s pour les murs en série (moins efficace que limiter le saut du trou).
- Plafond : × 2,4, × 2,8, × 3 ou sans limite durcissent la fin pareil, écarts dans le bruit. Le robot fort meurt de ses inattentions, la vitesse pèse peu sur lui. Sans limite : beaucoup trop rapide d'après les joueurs.
- À surveiller : murs en série par le haut, piège n°1. Avec 0,7 s de préavis, un débutant parcourt 100 px, le trou peut bouger de 140 px.
- Prod : le jeu ne garde pas l'attaque qui tue. Sur 1 083 parties de joueurs rodés, risque de 21 % (30-40 s) à 44 % (40-50 s) : un vrai mur, que le robot ne montre pas. Morts vers 2 s : sans doute des relances.
- `npm run equilibrage` ne départage pas des changements fins : une version témoin bouge déjà de 4 points. Utiliser `equilibrage:combos` et le joueur moyen.
- Enchaînements : pire paire à 45 s de +3,8 à +2,5 morts en trop. Survie sans bouger : éventail à 4 de 98 à 0 %, rouleau de 99 à 65 %.
- Écarté par Adrien : allonger la pause après 2 ou 3 hachoirs ou rouleaux. Pas retenus : la croix juste après un rouleau (il coupe souvent la seule sortie), et 1 couteau visé sur 3 qui vise là où va la tartine.
- À surveiller : dès 55 s, après 2 ou 3 hachoirs, l'attaque suivante reste plus dure (+2 à +3 morts pour 100), le point le plus dur. Après un rouleau, +1 à +3, surtout une croix. Pluie en biais : 84 % de survie sans bouger, gardée comme respiration.
- `waits` : le surplus venait de hachoir puis pluie, pas de pluie puis hachoir (de +1,8 à +0,5 à 45 s). Pluies par minute de 11,7 à 9,2. Biais laissée libre : +0,4 et +0,1.
- Mi-chemin : 7 % des doubles pluies ont encore une fourchette en bas quand la pluie suivante part. Pour attendre sa sortie : `WAIT_PASS` à 1.
- `holds`, choisi au ressenti : le joueur moyen ne voit pas la difficulté (-4,0 morts pour 100), et meurt un peu plus avec une attente (+1,4 à +2,2) car il se tient en bas, là où arrivent les fourchettes. Murs avec des fourchettes à l'écran de 14 à 0 %, murs par minute conservés (5,1 et 2,8).
- Sans toucher aux poids, on perdait 4 % de murs : un mur qui attend bloque les autres. À 1,12, il en manquait encore 5 %.
- Essayé puis retiré : la même règle pour toutes les pluies, qui retirait les murs (5,5 contre 2,8 par minute).

## Soirées et classements

- Pas de compte à créer : le téléphone garde un jeton pour toujours. Le même téléphone qui retape son pseudo retrouve son compte.
- Pseudo unique, 2 à 16 caractères : lettres latines, chiffres, espaces, tirets. Majuscules et accents ne comptent pas pour l'unicité.
- Trois classements : la soirée (pour le lot), général Mobile, général PC. À égalité, le premier à avoir fait le temps passe devant.
- Une seule soirée à la fois, créée à l'avance dans l'admin pour être annoncée.
- Mobile ou PC : les joueurs sur PC faisaient bien mieux. L'appareil vient de ce qui a bougé la tartine (souris ou doigt), sinon de l'écran. Une partie sur PC ne compte qu'au général PC. Adrien pense tout remettre à zéro avant la soirée. Limite : un tricheur décidé peut faire passer son PC pour un téléphone.
- Écran Classement : les 30 premiers, puis ta place, ligne toujours visible. Onglet PC d'office depuis un PC.
- Tartine d'or : 1er d'un classement d'au moins 10 joueurs (`WIN_MIN`), soirée, Mobile ou PC, à n'importe quel moment.
- Fin stricte : seules comptent les parties finies avant la fin, plus 15 s de marge réseau (`LATE_MS` dans `src/db.ts`). Une partie encore en cours compte au général, et le téléphone le dit.
- Gagnant : l'écran géant dès le zéro. Les téléphones attendent un classement relu au moins 10 s après les 15 s de marge (25 à 55 s après la fin) : le dernier reçu, parfois vieux de 40 s, annonçait le mauvais gagnant.
- Relecture : toutes les 10 s, 30 s sur l'accueil, jamais écran éteint. Serveur : 10 s en mémoire, général 60 s pendant une soirée. Ta place après une partie est à jour tout de suite.
- Une lecture abandonnée par le serveur n'est plus attendue au-delà de 5 s (`LOAD_MS`) : sinon ce classement restait bloqué pour de bon sur cette copie du serveur.

### Fiche joueur

- Toucher une ligne ouvre la fiche (`profile.js`, `routes/card.ts`, 10 s en mémoire). Un joueur retiré n'en a pas.
- Tenue, nombre de succès et objets sont sur le téléphone, envoyés dans `look` au début de chaque partie et 1,5 s après un changement.
- Tenue non vérifiée, sans effet sur les classements. Le serveur n'accepte que des objets qui existent (`cleanLook`), et le dessin ignore tout nom inconnu (`own` dans `art/kit.js`) : une aura `constructor` figeait le jeu de ceux qui ouvraient la fiche.
- La tenue suit le compte : chaque changement est daté à l'heure du serveur, le plus récent gagne (`lookUpdate`, en une requête SQL). Un appareil neuf prend la tenue du compte (`adoptLook`).
- Un objet gagné en jouant est mis et part partout. Un objet reçu ou rattrapé ne l'est pas : un appareil neuf mettait le premier reçu.

### Base

- Tables : `profiles` (joueurs), `sessions` (une clé par appareil), `runs` (parties), `events` et `entries` (soirées), `links` (codes de liaison), `google_states` (demandes Google en cours), `admins` et `admin_invites`, `client_errors`, `sound_reports`. Colonnes dans `migrations/`.
- `invalid` à 1 dans `runs` : partie retirée des records, gardée, ignorée par la Progression.
- Le serveur refuse une partie d'une ancienne version : l'heure de début suffit à savoir sur quel réglage elle a été jouée, pour nettoyer des records.

## Triche et sécurité

- Score refusé s'il dépasse le temps mesuré par le serveur, avec 15 s de marge (`SLACK_MS`), ou 15 min. Avec 5 s, un départ lent sur réseau saturé faisait refuser un score honnête. Contrepartie : un tricheur peut gagner 15 s.
- Signalés dans l'admin : le 1er quand il dépasse le 2e de plus de 30 % (au moins 60 s), et une partie ralentie ou en pause (plus de 15 % et 15 s de temps réel en trop).
- Faille connue : un faux score plausible (vers 60 s) passe inaperçu. Rejouer les parties depuis les gestes : écarté par Adrien.
- Jetons, identifiants, connexions et invitations hachés (SHA-256) : une copie de la base ne permet pas d'usurper un compte.
- Limites : 20 inscriptions par minute et par téléphone, 600 par IP (tout le lieu partage souvent la même). 10 débuts de partie par 10 s et 5 changements de pseudo par minute, par joueur.
- Admin : 30 échecs par minute et par IP. Une bonne clé ou invitation passe toujours : un invité malveillant ne peut pas bloquer les admins.
- Un joueur retiré ne monte plus. Renvoyer son ancien record ne le remet pas dans les classements en mémoire : il pouvait être « Bravo » à la fin de la soirée.
- En-têtes (`public/_headers`) : pas de script externe, pas d'affichage dans le cadre d'un autre site.
- Lectures publiques (`/api/board`, `/api/feed`, `/api/ecran`, `/api/players/…`) : pas de limite dans le Worker, la requête y compte déjà. À freiner par une règle Cloudflare, possible seulement avec un nom de domaine (voir À faire).

## Admin

- Accès : Paramètres, onglet Admin, sur un téléphone connecté. Ou `/admin`, ou 5 appuis rapides sur « Collectif Tartine Sauvage ».
- Premier accès avec `cle-admin.txt` : crée un compte propriétaire et reste la clé de secours.
- Le propriétaire invite : lien à usage unique valable 48 h. Dans l'appli installée, le coller dans « Lien d'invitation reçu ».
- Rôles : propriétaire (soirées, joueurs, équipe, erreurs) et admin (soirées, joueurs). Chaque téléphone peut être retiré, sauf le dernier propriétaire, avec ses invitations pas utilisées. Connexion inutilisée 30 jours : expirée.
- Heure de fin déjà passée : confirmation, le classement se ferme tout de suite. Une soirée fermée ne se modifie plus.
- Réunir deux comptes (propriétaire, définitif) : pseudo à garder, pseudo à réunir, confirmation avec les deux comptes. Même fusion que côté joueur (`mergeInto`). Refusé si l'un est retiré. `POST /api/admin/merge` sans `confirm: true` renvoie seulement l'aperçu.
- Joueurs actifs : point jaune pour une partie finie ces 10 dernières minutes (`ACTIVE_MS`), rien d'écrit en plus.
- Nouveaux pseudos des 15 dernières minutes listés même sans partie et sans score, pour retirer un pseudo déplacé affiché sur l'écran géant.

## Écran géant

- `/ecran`, en paysage : top 10 de la soirée (du général hors soirée), QR code, nombre de joueurs, fil des 6 derniers records et nouveaux pseudos des 15 dernières minutes.
- Dernier quart d'heure : chiffres rouges qui tremblent. À zéro : « Bravo X ! » et confettis.
- « Nouveau n°1 » pendant 6 s, seulement pour un record plus récent que le dernier connu (`at`, `last`), pas pour un 1er retiré ou réintégré. Comparer à l'heure de lecture ratait un record enregistré pendant la lecture.
- « Plein écran » empêche la veille. Après une mise en ligne, la page se recharge seule, sauf en plein écran : elle attend qu'on en sorte.
- Direct : pendant une soirée, 1 min après ses derniers scores et dans les 24 h avant, WebSocket (`/api/live`) vers un Durable Object (`Live`, hibernation). À chaque record, joueur, pseudo, retrait ou soirée modifiée, il dit « change » et les écrans relisent `GET /api/ecran` (une fois par seconde au plus). Un record s'affiche en moins de 1,5 s.
- WebSocket ouverte : relecture complète par minute, ping toutes les 25 s (réponse sans réveil), secours après 10 s sans réponse.
- Secours : nouvel essai après 1, 2, 5, 10 puis 30 s, demande toutes les 2 s avec `?v=` (le serveur lit 2 lignes), relecture complète toutes les 15 s car le repère ne bouge pas pour un joueur retiré ou renommé.
- Relecture 11 s après chaque annonce : une copie du serveur garde 10 s l'ancien état.
- Places : 20 écrans, 4 par IP, 20 connexions par minute (`LIVE_LIMIT`). Un écran muet depuis 1 min laisse sa place (`STALE_MS`). Si les 4 répondent, le nouveau reste sans direct : fermer le plus ancien créait une boucle dès 5 écrans sur le même wifi.
- Hors ligne : « Pas de réseau : classement de 21h04 » après 2 demandes ratées. Le compte à rebours suit l'heure.
- Onglet caché : aucune demande. Sans soirée proche : une par minute. Toutes les 10 s, un onglet oublié faisait 17 000 requêtes par jour.

## Son

- Pas de son sur les annonces : ça avantagerait ceux qui jouent avec le son.
- En local (`LOCAL`), son coupé à chaque chargement.
- Bruitages Mixkit : `public/sfx/`, hors git car leur licence interdit de les redistribuer avec le code source. À remettre avant de déployer depuis un autre PC. `SOUNDS` dans `audio.js`.
- Musique : `public/music/theme.m4a` ou `.mp3`, hors git : à remettre avant de déployer depuis un autre PC. Crédit dans `MUSIC_CREDIT`.
- Changer : remplacer le fichier, `MUSIC_CREDIT` et `MUSIC_PARTS` (`[[0, durée]]` pour tout jouer), puis `npm run deploy`.
- Elle ne joue qu'en partie et repart du début, pour suivre la difficulté. Hors partie, 2 s d'aperçu quand on lâche le curseur.
- Coupes calées sur 172 BPM, approximatives (`MUSIC_PARTS`). Passages recollés en mémoire et joués par une seule source (`stitch`) : aucun saut.
- À la mort, « sous l'eau » puis extinction (2,5 s). Recalage sur le chrono au-delà de 1,5 s d'écart, toutes les 5 s au plus (`DRIFT`) : mieux vaut un petit décalage qu'un saut.

### Pièges iPhone

- Web Audio, jamais `<audio>` : iOS le relançait seul après un appel ou depuis les AirPods, chaque saut faisait un trou, le mode audio changeait à chaque partie.
- Un seul état voulu, recalculé à chaque évènement (`reconcile`). Fondus sur l'horloge audio, volume sur un gain permanent.
- `navigator.audioSession` en « ambient » : le bouton silencieux coupe le jeu, Spotify continue. « playback » ferait l'inverse. Bug iOS connu du mode (WebKit 281955), rattrapé par la surveillance.
- Le son ne démarre qu'après un vrai toucher. Contexte bloqué, figé ou réveil refusé (retour d'arrière-plan, appli installée) : recréé au toucher suivant.
- Mémoire : 60 Mo décodé, pic de 150 Mo. Morceau téléchargé en entier (pas de « Range »), seulement si la musique est allumée.

### Diagnostic

- `?diag=son` : panneau et journal. En local, lignes `[son]` du terminal, pour suivre un téléphone sur le wifi.
- iPhone en prod : 4 rapports par session au plus (2 premières parties, anomalies). Table `sound_reports`, 14 jours, 2 000 au plus, 60 par minute et par IP, sans pseudo ni identifiant.
- Lire : `npx wrangler d1 execute croute-que-croute --remote --command "SELECT created_at, kind, standalone, ua FROM sound_reports ORDER BY id DESC LIMIT 20"`.
- Pas de vrai test sur PC : le WebKit de Playwright sous Windows n'a pas Web Audio. BrowserStack Live transmet le son d'un vrai iPhone.

## Succès

- 35 succès en 7 familles : liste, conditions et objets dans `achievements.js`.
- Insaisissable (5 frôlés enchaînés) est très dur : sur 300 parties du robot, x3 dans 10 %, x4 dans 2 %, x5 jamais.
- En détente : 3 s sans bouger. Un joueur immobile survit 5 s dans 0 % des cas, 3 s dans 5 à 15 %.
- Le jeu de la tartine : avoir la sauce du chef, rattrapé à la partie suivante pour ceux qui l'ont déjà.
- Six Seven : finir de 67,00 à 67,99 s. Tartine de minuit : heure du téléphone, de minuit à 3 h.
- Ciel : toucher grille-pain, citrouille, pirate, œuf, père Noël, soucoupe ou Tesla sur l'accueil (`touchSky`, `passerAt`).
- Première soirée : seulement au doigt, comptée à la fin de la partie, car la soirée ne compte que les téléphones.
- Retirés, à ne pas refaire : Joyeux Noël et Fidèle du Space (personne ne les avait), Chiffre rond et Ça change du beurre (doublons).
- Gardés dans `cv-succes`, sans effet sur le classement, copiés sur le serveur (`progress`). Le serveur réunit ceux des appareils (date la plus ancienne), et le téléphone ajoute le total sans fête.
- Rattrapage de ce que le serveur sait : temps de cuisson d'après le meilleur record à chaque classement ; à l'ouverture, première soirée, top 10, Tartine d'or, Tartinée express et Six Seven (`feats`, `onHistory`). Le reste vit sur le téléphone.
- Objet rattrapé : mis seulement si l'emplacement est vide. Succès de parties et Tartine d'or vus au classement ne sont pas mis : un appareil neuf mettait la brioche, datait sa tenue et effaçait celle du compte partout.

## Appli et réseau

- Installable : Installer sur Android, Partager puis « Sur l'écran d'accueil » sur iPhone. S'ouvre sans réseau après une première visite.

### Compte sur plusieurs appareils

- « Autre appareil », « Mon code » : QR et code de 8 caractères (sans 0, O, 1, I, L), 10 min, une seule fois. Un nouveau code annule l'ancien. 600 essais par minute et par IP, car tout le lieu partage souvent la même, 5 codes par minute et par compte.
- Scanner remplit le code (`#lier=`, jamais envoyé au serveur), il reste à toucher « Connecter » : un lien reçu ne branche personne à son insu. Sinon « J'ai déjà un compte ».
- Réponse perdue : le même appareil réessaie le même code 5 min (`RETRY_MS`). Base en panne pendant « Connecter » : le code redevient intact. Un QR scanné attend la fin de la partie.
- Fusion : « J'ai un code » sur un appareil connecté. « Réunir « B » avec « A » ? » sans consommer le code, puis tout en une fois sur le serveur. Échec : code toujours valable. Réponse perdue : relit le classement, « Comptes réunis ».
- On garde le compte qui a affiché le code : meilleurs records avec leur date (à égalité, le plus ancien), parties additionnées, soirées, succès, garnitures, appareils. L'autre pseudo redevient libre. Refusée si un compte est retiré.
- « Déconnecter les autres » : sort les autres appareils et annule le code (5 par minute et par compte). Quelqu'un qui a utilisé ton code revient au choix du pseudo, sans tes succès ni tes skins : le serveur garde la trace des clés sorties (`signed_out`) et dit `out` à l'appareil. Une clé simplement inconnue n'efface rien : si des comptes disparaissaient un jour, les joueurs garderaient leurs skins.

### Compte gardé par cookie

- Safari ne copie pas le stockage local dans l'appli installée, mais depuis iOS 17.2 il copie les cookies à l'installation. Le serveur range donc la clé dans un cookie (`cv_cle`, `HttpOnly`, `Secure`, `SameSite=Strict`, limité à `/api`, 400 jours). Un téléphone sans clé demande `POST /api/resume`.
- Sert aussi quand Safari efface le stockage (possible après 7 jours sans visite). Pas pour une appli installée avant le compte, ni avant iOS 17.2 : utiliser le code. En local, `Secure` demande `localhost`.
- Tant que `resume` n'a pas répondu, pas de choix du pseudo, nouvel essai toutes les 3 s : sinon le joueur se créait un 2e compte. Après une connexion par code dont le classement n'arrive pas, le jeu garde la clé.

### Navigateurs des applis

- Sur iPhone, Safari, l'appli, Chrome et le navigateur de Snapchat ou Instagram ont chacun leur stockage. Le QR des affiches ouvre toujours Safari. Vu en prod : un joueur dans Snapchat recrée un compte dans l'appli.
- Dans Snapchat, Instagram, Facebook, Messenger ou TikTok (`inapp.js`), l'accueil dit d'ouvrir le jeu dans Safari (Chrome sur Android), avec « Copier le lien ». Pas d'installation proposée. Pas reconnu : Discord et WhatsApp, qui se présentent comme Safari.
- « Ce pseudo est déjà pris » renvoie vers « J'ai déjà un compte », et l'écran du code dit où le trouver.
- Plus d'accès à l'ancien compte : l'admin réunit les deux.

### Changement d'adresse

Le stockage d'un navigateur et le cookie `cv_cle` sont liés à l'adresse. Pour passer de `croute-que-croute.tartine-sauvage.workers.dev` à `croute-que-croute.tartinesauvage.fr`, le compte fait le trajet tout seul (`move.js`, `arrive.js`).

- Le même Worker répond sur les deux adresses (`workers_dev: true` et `routes` dans `wrangler.jsonc`). Sans `workers_dev`, l'ancienne s'éteindrait au déploiement.
- Dans un navigateur, l'ancienne adresse crée un code de liaison et renvoie vers la nouvelle avec `#demenage=` : le code, les succès, la tenue et les réglages (`KEPT`), jamais la clé. Pas pendant une partie, pas avec un score en attente. Joueur connecté sans code : il reste, nouvel essai au classement suivant.
- `arrive.js`, chargé avant le jeu, pose ces valeurs et efface l'adresse. Le téléphone se connecte seul avec le code, sans toucher « Connecter », et garde aussi sa session sur l'ancienne adresse. Le code reste jusqu'à une réponse du serveur : sans réseau ou avec une limite, nouvel essai au classement suivant.
- Nouveau QR scanné par un ancien joueur : le téléphone n'a pas de clé sur la nouvelle adresse. `arrive.js` fait une seule fois un aller-retour par `/depart` sur l'ancienne (`depart.js`, une page légère, 8 s au plus), qui rapporte le compte s'il y en a un. Un nouveau joueur ne perd qu'un chargement de page. « J'ai déjà un compte » propose aussi d'y retourner à la main.
- Un appareil déjà connecté garde ses réglages. S'il a un autre compte, il propose de réunir les deux.
- Une appli installée reste sur l'ancienne adresse et continue de marcher : elle ne peut pas changer d'adresse. L'accueil propose « Copier le lien » vers la nouvelle, avec un code renouvelé toutes les 9 min, puis il faut réinstaller.
- `/ecran` et `/admin` ne suivent pas : les ouvrir sur la nouvelle adresse. Admin : `cle-admin.txt` la première fois.
- Avant de partir, l'ancienne adresse teste la nouvelle (`reachable`, 4 s). Injoignable : le joueur reste et joue, nouvel essai au classement suivant. Un DNS en retard, comme une box ou un fournisseur, peut ignorer un sous-domaine jusqu'à 24 h après un changement de serveurs de noms.
- `npm run deploy` et `npm run verif` passent par l'ancienne adresse : même Worker, et pas de dépendance à ce retard.

### Connexion avec Google

Désactivée en prod tant qu'on n'a pas le nom de domaine : sans les clés, les 3 routes répondent 404, les boutons restent cachés et un `#google=` tapé à la main est ignoré. La migration 0014 est appliquée, sa colonne et sa table restent vides.

Pour retrouver son compte sur un nouvel appareil sans code. Lier ou délier : Paramètres, Autre appareil. Se connecter : « J'ai déjà un compte », « Continuer avec Google ». Elle ne crée pas de compte : sans compte lié, le joueur reçoit un message. Un compte Google ne se lie qu'à un joueur.

- Le serveur parle à Google lui-même (`src/routes/google.ts`) : `POST /api/google/start` note la demande dans `google_states` (10 min, un seul usage) et pose le cookie `cv_google`, puis Google renvoie sur `GET /api/google/retour`, qui compare le cookie, échange le code et revient sur `/#google=<résultat>`. Aucun script Google dans la page, la politique de sécurité ne change pas.
- On demande `openid email`, parce que la documentation de Google l'exige, mais on ne garde que `sha256("google:" + sub)` dans `profiles.google_hash`. L'adresse e-mail n'est jamais enregistrée.
- Bouton caché sans clés, sur l'ancienne adresse (elle n'est pas déclarée chez Google), dans les navigateurs d'applis (Google y refuse la connexion) et dans l'appli iPhone de l'écran d'accueil (la page de Google s'y ouvre dans un autre stockage : à vérifier sur un vrai iPhone avant de l'ouvrir).
- En place : projet Google Cloud `croute-que-croute-tts` sur le compte d'Adrien, appli « En production », identifiant OAuth « Application Web », URI de redirection `https://croute-que-croute.tartinesauvage.fr/api/google/retour`, clés posées avec `npx wrangler secret put GOOGLE_CLIENT_ID` et `npx wrangler secret put GOOGLE_CLIENT_SECRET`. Une autre adresse de jeu demande d'ajouter son URI chez Google. Il faut les deux clés : avec l'ID seul, le bouton s'affiche mais la connexion échoue.
- Les tests automatiques remplacent la réponse de Google : après un changement de ce parcours, refaire la liaison et la connexion avec un vrai compte.

### Mises à jour

- Le jeu se recharge seul quand la version change, seulement à l'accueil, pas pendant qu'on tape. Jamais en partie ni sur l'écran de mort, où « Rejouer » ou « Accueil » le fait.
- Le serveur refuse les demandes d'une ancienne version, sauf le départ d'une partie lancée par la version juste d'avant (`APP_PREVIOUS`) : un rechargement en pleine partie passait pour un gel. Plus vieille encore : la partie continue sans compter, l'écran de mort le dit.
- Page et code de deux versions sans plantage (élément attendu par `screens.js` absent) : rechargement une fois (`applyUpdate`, toutes les 15 s au plus).

### Parties et score

- Une partie ne compte que si le réseau passe au départ (8 s), même si le classement n'est pas encore là (wifi saturé). Seul un joueur retiré joue sans envoyer.
- Toute autre demande abandonne après 10 s : « Pas de réseau, réessaie. »
- L'envoi du score réessaie 2 min (« Envoi en attente… »), même si on ferme le jeu. Le renvoi d'une partie enregistrée redonne la même réponse.
- Tout ou rien : la partie est marquée finie dans la même opération que le record et la soirée, en dernière écriture. Deux envois à la même milliseconde comptent une partie. Un renvoi après la fin de la soirée la garde.
- Téléphone verrouillé : pause, « Touche pour reprendre ». Le temps compte pour le serveur, d'où l'alerte « partie ralentie » de l'admin. Le doigt posé est relâché.
- Hors ligne : les records sont gardés (`cv-records`, `keepBests`). Un score hors ligne n'est pas envoyé et ne compte que jusqu'au prochain classement.
- L'écran de fin suit la réponse du serveur : « Nouveau record » s'enlève si le serveur ne le compte pas. Un classement demandé avant le score, arrivé après, ne l'efface pas.

### Cache et chargement

- `sw.js` : renouvelé à chaque version, rempli fichier par fichier avec un 2e essai. Un seul fichier raté faisait tout perdre.
- Fichier sans réponse en 3 s (`NET_MS`, wifi saturé) : pris dans le cache, remplacé dès que le réseau arrive.
- Plantage au démarrage (fichiers de deux versions, par exemple l'ancienne page du cache avec du code neuf sur réseau lent) : `boot.js` recharge. Si ça replante dans la minute, il vide le cache, retire le service worker et redemande chaque fichier au serveur avant de recharger, en ligne seulement : sur iPhone, un simple rechargement garde le module déjà en mémoire. Troisième échec : il s'arrête. Une seule recharge laissait le joueur bloqué sur l'écran.
- Une erreur dans une image n'arrête pas l'animation : l'image suivante est demandée avant de dessiner.
- L'écran géant installe lui-même le cache, pour un PC qui n'ouvre que `/ecran`. Une page autre que le jeu ne retombe jamais sur l'accueil du jeu.
- L'admin passe toujours par le réseau : l'ancien script sur la nouvelle page la laissait vide.
- Écran de chargement : attend le classement 2,5 s au plus, pour jouer hors ligne, et disparaît à 10 s quoi qu'il arrive.

### Performances

- Image médiane au-dessus de 20 ms : netteté baissée par paliers (`QUALITY` : 2, 1,5, 1,25, 1), gardée 12 h. Pour toujours, un iPhone en économie d'énergie restait flou.
- Planètes en image (`art` dans `scene.js`) : fixes dessinées une fois, animées 30 fois par seconde au plus (`REDRAW_S`). Mesuré : 2,2 à 3,8 ms en direct, 0,1 à 0,2 ms en image.
- Hauteur des planètes non arrondie : au pixel près, elles restaient immobiles puis sautaient.
- Chrono réécrit au plus toutes les 30 ms (`DIGITS_MS` dans `run.js`) : chaque réécriture recalcule la page. Mesuré : de 99 à 50 ms par tranche de 5 s sur PC.
- Calques vides masqués (`fx`, `party`) : sinon deux calques plein écran à assembler à chaque image.
- `modulepreload` des 59 modules dans `index.html` : prêt en 3,9 s au lieu de 4,6 s avec 300 ms de latence.
- iPhone d'avant iOS 15.4 : `Object.hasOwn`, appelé à chaque image, empêchait tout dessin. Remplacé, interdit par `shell.test.mjs`.
- Essayés et pas gardés : tartine ou couverts en image, étoiles par paquets, chrono en `contain`, Rust (WebAssembly) : le dessin se fait dans le navigateur, et une vérification d'attaque prend 0,05 ms.

## Versions

- Le numéro s'affiche en bas des Paramètres. Les erreurs gardent aussi le commit (`0.44.0+d7379fd`).
- Le numéro est dans `package.json`. Le monter avant chaque mise en prod : `npm run deploy` refuse un numéro déjà en ligne ou plus petit, puis pose le tag `v0.44.0` et l'envoie sur GitHub.
- Quel chiffre monter. Si une mise en prod mélange plusieurs choses, on monte le chiffre le plus à gauche concerné, et ceux à sa droite repartent à 0.
  - 1er chiffre : 0 tant que le jeu est en bêta. Passe à 1.0.0 quand Adrien décide la sortie de bêta, par exemple pour la première soirée ouverte au public. Ensuite, seulement pour un changement qui casse l'existant : classement remis à zéro, comptes à refaire.
  - 2e chiffre : une nouveauté que le joueur voit ou peut faire. Nouvelle attaque, skin, écran, option, nouvelle règle d'enchaînement, ou attaque qui change de comportement.
  - 3e chiffre : tout le reste. Correction de bug, réglage d'un chiffre, texte, performances, changement invisible pour le joueur.
- Chaque version a son tag (`git show v0.26.3`). `git describe --tags <commit>` retrouve la version d'un ancien identifiant comme `mvxswkrk-bdb42a4`.
- La colonne de droite compte les mises en ligne de correctifs qui ont suivi (vide : aucune).

| Version | Date | Nouveautés | Correctifs ensuite |
|---|---|---|---|
| 0.1 | 28/10 | première mise en ligne : jeu, classement, appli, musique | 2 |
| 0.2 | 28/10 | appli admin avec invitations et rôles | |
| 0.3 | 28/10 | jeu et admin dans une seule appli | |
| 0.4 | 28/10 | boutons musique et sons, musique calée sur la partie | |
| 0.5 | 28/10 | bruitages | 1 |
| 0.6 | 28/10 | croix, couloir, double pluie, tartinades rares | 1 |
| 0.7 | 28/10 | soirées et classements, profil gardé, classement général | 1 |
| 0.8 | 28/10 | nom de soirée modifiable, page Infos qui défile | |
| 0.9 | 28/10 | annonces des attaques en pastilles | |
| 0.10 | 29/10 | Paramètres, installation, partage, QR code, crédits | 1 |
| 0.11 | 29/10 | choix des commandes : joystick ou pavé | |
| 0.12 | 29/10 | une seule commande : glisser partout | |
| 0.13 | 29/10 | confettis sur un record ou la 1re place | |
| 0.14 | 29/10 | volumes musique et bruitages | |
| 0.15 | 29/10 | alerte triche dans l'admin et l'écran géant | |
| 0.16 | 29/10 | succès à débloquer | 3 |
| 0.17 | 29/10 | fil en direct sur l'écran géant, envoi du score tenace | 1 |
| 0.18 | 29/10 | planètes des affiches en fond | 1 |
| 0.19 | 29/10 | rival à battre, série de frôlés, entraînement, traînées | |
| 0.20 | 29/10 | changer de pseudo | 1 |
| 0.21 | 29/10 | ciel qui chauffe, cicatrices, murs en série | |
| 0.22 | 30/10 | arrêt sur image, Tartinée par…, garnitures | |
| 0.23 | 30/10 | succès secrets et badge Nouveau | 1 |
| 0.24 | 30/10 | accessoires | |
| 0.25 | 30/10 | étoiles filantes, prochaine soirée annoncée | 1 |
| 0.26 | 30/10 | planètes drôles et Tung Tung Tung Sahur | 6 |
| 0.27 | 30/10 | classements Mobile et PC, succès revus | |
| 0.28 | 30/10 | tenue de la tartine | |
| 0.29 | 30/10 | tartine sans croûte | |
| 0.30 | 31/10 | nouvelles planètes du fond | |
| 0.31 | 31/10 | retours des joueurs, mains Six Seven | |
| 0.32 | 31/10 | fiche joueur | 2 |
| 0.33 | 31/10 | code et QR pour un autre appareil | |
| 0.34 | 31/10 | fusion de deux comptes | 3 |
| 0.35 | 31/10 | déconnecter les autres, Guide, planète pirate, son refait | 1 |
| 0.36 | 31/10 | bonnet de Noël gagné sur le père Noël | |
| 0.37 | 31/10 | planète œuf de Pâques et oreilles de lapin | |
| 0.38 | 01/11 | sauce du chef, grille-pain secret, record hors ligne | |
| 0.39 | 01/11 | antennes d'alien et casque d'astronaute | |
| 0.40 | 01/11 | succès refaits en 7 familles | |
| 0.41 | 01/11 | page Succès avec progression | |
| 0.42 | 01/11 | remontée des erreurs des joueurs | |
| 0.43 | 01/11 | rouleau en aller-retour, enchaînements, même trou partout | 1 |
| 0.44 | 01/11 | numéros de version, compte gardé dans l'appli, rouleaux espacés | 1 |
| 0.45 | 01/11 | auras : Surchauffe, Survoltée, Néon, Anneau planétaire | |
| 0.46 | 01/11 | Tartine d'or : 1er d'un classement d'au moins 10 joueurs | 1 |
| 0.47 | 01/11 | tenue qui suit le compte, rechargement si versions mélangées | 4 |
| 0.48 | 02/11 | pluies espacées après une double pluie ou un hachoir | |
| 0.49 | 03/11 | écran géant en direct, fin de soirée stricte, mur mis de côté | 8 |
| 1.0 | 06/11 | sortie de bêta, adresse tartinesauvage.fr, comptes qui suivent seuls | 1 |
| 1.1 | 06/11 | succès secret Le jeu de la tartine | 1 |
| 1.2 | 06/11 | ancien joueur reconnu avec le nouveau QR, appareil sorti qui oublie ses skins, connexion Google prête | |

## Erreurs des joueurs

- `public/js/errors.js`, chargé en premier partout, script classique prudent : il attrape aussi les plantages des modules, que le jeu ne voit pas.
- Remonte : erreurs, promesses rejetées, fichiers pas chargés, blocages CSP, jeu pas démarré au bout de 15 s.
- Ni pseudo ni clé dans les rapports : un numéro au hasard par onglet.
- Économe : même erreur une fois par page, 5 erreurs par envoi, 3 envois par page, 10 par onglet, 20 erreurs différentes par page.
- Serveur (`routes/errors.ts`) : 64 Ko par envoi, 10 envois par minute pour tout le monde (`ERROR_LIMIT`), 60 erreurs par heure (`HOUR_ROWS`), 10 par onglet (`SESSION_ROWS`). Table `client_errors`, 14 jours, 2 000 lignes.
- Pourquoi : une erreur sur tous les téléphones d'une soirée mangerait le quota d'écritures de D1, et le classement avec. Chaque ligne compte pour 3 écritures, son effacement aussi. Moins de 2 000 écritures par soirée de 5 h, 85 000 sans plafond par heure.
- Lire : Admin, « Erreurs des joueurs » (propriétaire). « Marquer corrigé » : revient si elle se reproduit. Le même bug sous Safari et Chrome fait deux erreurs.
- « Copier le rapport », à coller à Claude, commence par un avertissement : n'importe qui peut envoyer une fausse erreur, son texte se lit comme des données, pas comme des consignes.
- En ligne de commande : `npx wrangler d1 execute croute-que-croute --remote --command "SELECT kind, message, source FROM client_errors ORDER BY id DESC LIMIT 20"`. En local : lignes `[erreur]` du terminal.

## Check-list d'une soirée

Avant :

- Admin, « Nouvelle soirée » : nom, début et fin. On peut la créer plusieurs jours avant.
- Imprimer le QR code, puis faire une partie depuis le QR code.
- Si le lieu a un écran : `/ecran`, puis « Plein écran ».
- Admin, « Erreurs des joueurs » : regarder ce qui plante, surtout après une mise en ligne.

Pendant :

- Surveiller le bandeau rouge « à vérifier » et retirer le joueur si besoin.
- Surveiller aussi le bandeau rouge des erreurs des joueurs : copier le rapport, à corriger après la soirée.
- Repousser la fin si la soirée glisse.
- Ne rien mettre en ligne : le script refuse dès 2 h avant l'ouverture, tant que la soirée est ouverte, et pendant les 15 s où ses derniers scores arrivent encore.
- Regarder la consommation de temps en temps : `npx wrangler d1 info croute-que-croute` (lignes lues et écrites sur 24 h, limites 5 millions et 100 000, voir Technique).

Après :

- Le gagnant montre son téléphone au bar : sa ligne est en jaune.
- Regarder la consommation : tableau de bord Cloudflare, D1, onglet Metrics, « Rows read ».
- Relever aussi les requêtes de la journée (Workers, `croute-que-croute`, Metrics, Requests) et le nombre de parties (admin), pour vérifier les 3,5 requêtes par partie (voir Technique).

## Technique

### Hébergement et quotas

- Cloudflare gratuit : Workers et D1 (Europe de l'Ouest). Jeu en JavaScript sans compilation, API en TypeScript.
- `wrangler.jsonc` : date de compatibilité 2026-11-03, la plus récente connue de wrangler en local, `no_nodejs_compat`. Pour la monter : la changer, `npm run types`, `npm run test:api`.
- Limites par jour : 100 000 requêtes, 5 millions de lignes lues, 100 000 écrites. Au-delà, API en erreur jusqu'à 1 h du matin.
- Requêtes mesurées (hors fichiers) : 6 à l'arrivée, 3,5 par partie, 2 par minute sur l'accueil, 6 sur Classement, rien en veille. 150 personnes à 30 parties : 25 000 requêtes, un quart de la limite. Limite atteinte vers 28 000 parties par jour.
- Durable Objects, à part : 100 000 demandes et 13 000 Go-s par jour. Une demande par record, joueur, changement admin ou connexion d'écran. Rien en hibernation. Quota tombé : l'écran passe au secours.
- Pour les tenir : index partout, classement en mémoire mis à jour sur place, rien écran éteint, demandes simultanées sur la même lecture (`cached`).
- Mesuré sur 24 h (584 parties) : 425 lignes lues et 5,6 écrites par partie, avant la fiche légère : à remesurer en soirée. Pointe : 401 parties en une heure à 10 joueurs.
- Fiche légère : le profil garde ses totaux et ses records (`steps`), une ligne lue au lieu de 734. `steps` NULL : recalcul une fois depuis les parties, par exemple après une fusion. Après une retouche à la main : `UPDATE profiles SET steps = NULL`.
- Général : 1 000 premiers en mémoire, au-delà la place se compte.
- Lectures : `npx wrangler d1 insights croute-que-croute --timePeriod 1d --sort-type sum --sort-by reads --limit 8`. Erreurs serveur : 3 jours dans Cloudflare, `npx wrangler tail` en direct.
- Non retenus : cache partagé en Durable Object (quota à peu près consommé par une soirée), lecture partagée entre deux demandes (risque d'erreurs, gain faible).
- Node 26 (LTS), écrit dans les 3 fichiers de `.github/workflows/` : Dependabot ne le monte pas.

### Design

- Tout passe par `public/tokens.css`, chargé en premier partout : couleurs, tailles, espacements, rayons, durées, calques, opacités, `--tap` 44 px. Vérifié par `palette.test.mjs`.
- Rouges : `--jam` titres, `--jam-deep` sous un texte crème (5,4:1), `--jam-light` texte d'erreur (6,5:1).

### Outils locaux

Seulement en local (`shared/local.js`), téléphone sur le wifi compris.

- `?garnitures=toutes`, `?accessoires=tous`, `?succes=tous` (pour de bon sur ce navigateur), `?planetes=souvent`, `?etoiles=souvent`, `?jeton=<jeton>` (lien de `npm run seed`).
- Mode invincible : carte « Mode test » de Paramètres. La partie compte comme une autre.

### Dossiers

- `public/js/game/` : le jeu sans affichage, partagé avec les tests.
- `public/js/app/` : `main.js` (branchements), `state.js` (état partagé), `run.js` (boucle, partie, mort), `over.js` (écran de fin), `pages.js` (navigation), `screens.js` (affichage), dessin, son, succès, serveur. Dessins dans `art/` et `sky/`.
- `public/js/admin/`, `ecran/`, `shared/` (stockage, `palette.js`, `banner.js`).
- `src/` : `worker.ts` (routes), `db.ts` (base et cache), `live.ts` et `slots.ts` (direct), `validate.ts`, `security.ts`.
- `src/routes/` : `board.ts` (classements, écran), `player.ts` (inscription, reprise, pseudo), `look.ts` (tenue, progression), `card.ts` (fiche), `runs.ts` (parties), `link.ts` (codes, fusion), `google.ts`, `admin.ts`, `diag.ts`, `errors.ts`.
- `CLAUDE.md` et `.claude/` : consignes et réglages de Claude Code. `.worktreeinclude` : fichiers hors git copiés dans un worktree, sans lesquels le jeu n'a ni son ni clés de test.

### Types

- `npm run check` vérifie le serveur et le téléphone en mode strict.
- Le code du téléphone se type en JSDoc d'une ligne (`@type`, `@param`), sans commentaire explicatif : il part tel quel sur les téléphones.
- Les formes de données sont dans `navigateur.d.ts`. Les réponses d'API y sont écrites à la main d'après `src/` : les tenir à jour quand une réponse change.
- Les variables qui démarrent à `null` dans `audio.js`, `diag.js` et `ecran.js` sont déclarées non nulles : le compilateur ne les protège pas, le code garde ses gardes.

### Commandes

| Commande | À quoi ça sert |
|---|---|
| `npm run db:local` | Créer la base locale (à refaire après une migration) |
| `npm run seed` | Remplir la base locale, jamais en ligne. Donne un lien `?jeton=`. `--soiree` : une soirée en cours. `--persist-to <dossier>` : une autre base |
| `npm run dev` | Jeu sur http://localhost:8787. Dans l'app Claude, `.claude/launch.json` l'ouvre au wifi |
| `npm run db:remote` | Migrations en ligne, avant `npm run deploy` (`scripts/migrer.mjs`). Refuse si : git pas à jour, hors de `master`, pas envoyé, prod sans réponse, soirée ouverte, 15 s de marge, ou soirée qui ouvre dans moins de 2 h. `-- --pendant-soiree` en urgence |
| `npm run deploy` | Mettre en ligne, puis `npm run verif`. Si la vérification échoue, la version reste en ligne et la commande sort en échec. Refuse si : git pas à jour, hors de `master`, pas envoyé, fichiers hors git de `public/` absents ou en trop (`wrangler` envoie tout `public/`, attendus : `theme.m4a` et les 5 bruitages), `node_modules` en retard (arrêter le serveur, `npm ci`), types ou tests en échec, Tests, Safari ou Équité pas verts, migration manquante, prod anormale, version pas montée, soirée ouverte, 15 s de marge, ou soirée qui ouvre dans moins de 2 h (`scripts/garde.mjs`) |
| Options de `deploy` | `-- --pendant-soiree` en urgence, `-- --sans-github` si GitHub ne répond pas. Un commit README ou images garde le résultat d'avant. Un passage d'Équité reste valable tant qu'aucun fichier de ses `paths` n'a changé |
| `npm run verif` | Prod en lecture seule. `npm run verif -- 0.46.1+373facb` exige cette version |
| `npm run icons`, `npm run qr` | Regénérer icônes et QR codes |

## Tests

- Règle : chaque bug corrigé reçoit un test qui l'aurait attrapé, côté téléphone aussi, vérifié par mutation (on remet le bug, le test doit échouer).
- Pas automatisé, à voir sur un vrai téléphone : le dessin au-delà du « ne plante pas », le son, la vibration, l'installation de l'appli et la fluidité.
- `npm run check` : types de l'API et du JavaScript de `public/js`. Attrape un import disparu (la page admin blanche) ou un nom mal tapé.
- `npm test` ou `npm run test:unit` : le code du téléphone, sans serveur (4 s).
- `npm run test:api` (`test/api.mjs`, avec `player.mjs` et `admin.mjs`, 1 min) : chaque route, cas normal et refus, sur une base neuve à part, port 8790 (`TEST_PORT` pour un autre).
- `npm run test:navigateur` (`test/navigateur.mjs`, Playwright, Edge sous Windows, Chromium sur GitHub, 30 s) : parcours complet joueur, écran géant, admin, sans erreur de console ni fichier manquant (sauf la musique et les bruitages). Le test ajoute à `run.js` une poignée `window.__jeu`, dans son navigateur seulement.
- `npm run equite` (`test/fairness.mjs`, 4 min) : le robot parfait. `npm run verif` : la prod (réessaie 30 s après une mise en ligne).

### Pièges WebKit

- `NAVIGATEUR=webkit npm run test:navigateur` : même parcours en profil iPhone 13. Avant, `npx playwright install webkit` si Playwright a changé.
- « Refused to apply a stylesheet » ignoré sous WebKit : celui de Linux dessine le menu « Rôle » avec un style que la CSP bloque. Jamais vu sur iPhone, Chromium attrape les vraies erreurs CSP.
- `serviceWorkers: "block"` sur une page qui intercepte des requêtes : hors Chromium, Playwright ne les intercepte plus sous un service worker.
- Sur GitHub, image Docker de Playwright : installer WebKit dépassait 10 min.

### Tests unitaires

`test/unit/*.test.mjs`, `node --test`, sans dépendance. `env.mjs` remplace le navigateur, `d1.mjs` donne une base SQLite en mémoire avec toutes les migrations.

- `achievements` : succès au bon moment, rien de perdu entre onglets, annonce unique.
- `api` : limite d'attente, reprise par cookie refaite.
- `attacks` : mur mis de côté, chaque garniture sur un couteau.
- `banner` : bandeau des soirées, « Bravo », direct ouvert 1 min.
- `cache` : cache des classements, lecture unique, périmée écartée, abandon à 5 s.
- `chemin` : chemin du robot, gardé hors du code des téléphones.
- `deploy` : refus de `npm run deploy`.
- `google` : empreinte sans e-mail, cookie, usage unique, 10 min, jeton refusé, délier.
- `inapp` : navigateurs des applis (vrais user agents).
- `link` : code de liaison, panne de base, réessai concurrent.
- `migrations` : au-dessus de la 0015, ni `DROP TABLE`, ni `DROP COLUMN`, ni `RENAME`, sauf fichier écrit dans `ALLOWED`.
- `move` : changement d'adresse, jamais la clé dans le lien, lien fabriqué ou illisible.
- `offline` : record après coupure, pseudo gardé.
- `palette` : `palette.js` et `tokens.css` identiques, feuilles sans valeur en dur.
- `record` : classement tardif sans effet sur le record.
- `refus` : cause d'un refus du solveur.
- `resume` : reprise ratée, pas de choix du pseudo.
- `robustesse` : netteté 12 h, hauteur invalide, cache malgré un fichier raté.
- `routes` : route admin sans `access` refusée.
- `runs` : même score à la même milliseconde, une partie.
- `shell` : `SHELL` de `sw.js`, `modulepreload`, pas d'`Object.hasOwn`, éléments de `screens.js`.
- `slots` : écran qui répond jamais chassé.
- `sprites` : chaque objet et planète se dessine, nom inventé sans effet.
- `sync` : tenue entre appareils.
- `validate` : pseudos, tenue, progression, fusion.
- `variante` : la copie d'`equilibrage:variante` démarre.

### GitHub

- `tests.yml` : à chaque envoi de code sur `master` et chaque pull request, types et trois niveaux de tests (2 min). Sur le dépôt public, un envoi sur `master` ne l'a encore jamais lancé : avant une mise en ligne, `gh workflow run tests.yml --ref master`.
- `safari.yml` : à la main avant chaque mise en ligne, `gh workflow run safari.yml --ref master`. `npm run deploy` exige qu'il soit vert.
- `equite.yml` : robot et invariants en petit, quand `public/js/game/`, `palette.js` ou le robot change (4 min). `npm run deploy` exige qu'il soit vert : sans passage valable, `gh workflow run equite.yml --ref master`.
- Un envoi annule les tests en cours. Dépôt public : minutes gratuites.
- Dependabot : une pull request npm et une d'actions par mois. Fusionner si c'est vert, puis `git pull` (sinon le prochain envoi est refusé).

## Ajouter du contenu

- Attaque : une fonction dans `attacks.js` et une ligne dans `ATTACKS`. Le solveur la vérifie seul. Puis refaire un point d'équilibrage.
- Arme : `projectiles.js` et `art/cutlery.js` (`PROJECTILE_SPRITES`), même nom.
- Planète ou objet : dessin dans `sky/` ou `art/`, ligne dans `BODIES`, `PASSERS`, `HATS`, `SIDES`, `BREADS` ou `AURAS`. Nouveau fichier : dans `SHELL` de `sw.js` et en `modulepreload`.
- Tartinade : une ligne dans `SPREADS` avec `with`. Sans `free`, elle tombe seule sur les couteaux.
- Événement de partie : renvoyé par `step` de `sim.js`, traité dans `ON_SIM` de `run.js`.
- Succès : `ACHIEVEMENTS`, condition dans `runTick`, `runEnd`, `afterSubmit` ou `onBoard`.
- Route : `src/routes/` et une ligne dans `src/worker.ts`, avec son niveau d'accès.

## À faire

- Freiner les requêtes avant le Worker avec une règle Cloudflare sur tartinesauvage.fr (voir Triche et sécurité). Tout le lieu partage souvent la même IP : choisir le seuil après une soirée mesurée.
- Retirer la colonne `profiles.client_id`, plus écrite depuis le 02/11/2026, dans une migration d'une mise en ligne suivante : la retirer tout de suite casserait le retour à la version d'avant, qui l'écrit encore. `profiles.token` reste : obligatoire et unique, la retirer demande de reconstruire la table.
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Faire monter le morceau par un ami DJ : coupes et transitions propres, fin qui boucle.
- Compte sur plusieurs appareils : reste, pour récupérer son compte sans autre appareil, un code de secours ou un code reçu par e-mail. L'e-mail passerait par le compte Resend de Movie Picker (gratuit : 3 domaines, 100 e-mails par jour et 3 000 par mois partagés entre les projets), avec tartinesauvage.fr comme domaine d'expéditeur.

### Après le compte multi-appareils

À commencer seulement une fois les lots du compte multi-appareils finis.

- Revoir le design du tableau de bord admin.

### Ajouté par Adrien le 01/11/2026

- Débloquer des fonds de jeu tirés des affiches des soirées.
- Toucher une bière (par exemple les canettes 8.6 et Maximator de l'étoile filante) pour un effet « bourré » sur le jeu.
- Skin Tung Tung Tung Sahur pour la tartine (le personnage de la planète drôle).
- Débloquer des musiques (à rapprocher des morceaux des collègues DJ, plus haut).
- Nouvel emplacement de tenue : une traînée derrière la tartine (miettes, paillettes) ou un effet de mort (la tartine éclate en confettis), à débloquer.

### Ajouté par Adrien le 02/11/2026

- Page `/tech` comme sur Movie Picker (movie-picker.fr/tech) : le dossier technique publié dans le jeu, avec des chiffres relevés dans le dépôt plutôt qu'estimés.

### Analyse du solveur du 04/11/2026 : pas fait

- Plafonner le répit des refus à environ 0,3 s : fermerait le blocage devant un rouleau (voir Équité) et garderait 97 % des répits actuels. Pas encore mesuré, à décider après la soirée du 07/11.

## Idées pour plus tard

- Vibration au frôlé.
- Compteur de la salle sur l'écran géant : temps cumulé de toutes les parties de la soirée. Une ligne écrite en plus par partie.
- Pas retenues pour l'instant : thème de soirée choisi par l'admin, tartine du designer ou redessinée (Adrien garde la tartine actuelle, pistes dans `maquettes/`), étoiles au rythme de la musique, son d'annonce par attaque, couche de tension, podium de fin de soirée sur l'écran géant.

## Bon à savoir

- Hors git, à garder de côté : `cle-admin.txt`, `.dev.vars`, `invitation-*.txt`, `sauvegardes/`, la musique, les bruitages, `ecoute-sons/` (`node ecoute-sons/serve.mjs`). `.gitignore` écarte aussi `.env*`, `.dev.vars*`, tout `*.sql` hors de `migrations/` et tout `public/sfx/` et `public/music/` sauf `.gitkeep`.
- Sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`. Celles d'avant le 29/10/2026 contiennent des jetons en clair : à garder pour soi.
- Time Travel, 7 jours, gratuit : `npx wrangler d1 time-travel restore croute-que-croute --timestamp=<heure unix>`. Écrase la base en ligne : sauvegarder d'abord.
- Revenir à la version d'avant : `npx wrangler versions list`, puis `npx wrangler rollback <id> -m "<raison>"`. Pas encore essayé : le faire une fois hors soirée.
- Impossible de revenir de la 0.49.0 ou plus à la 0.48.0 ou avant : Cloudflare refuse quand une classe Durable Object (`Live`) a été ajoutée entre les deux. Plan B : corriger, puis `npm run deploy -- --pendant-soiree`. Entre deux versions avec `Live`, le retour reste possible.
- La base ne revient pas en arrière : une migration doit laisser marcher la version d'avant (ajouter des colonnes, jamais en retirer ni en renommer dans la même mise en ligne). `migrations.test.mjs` le vérifie ; le retrait de `client_id` devra s'y déclarer dans `ALLOWED`. Après un retour avant le 02/11/2026 puis une remise en ligne : `UPDATE profiles SET steps = NULL`.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami`).

## Licence

Code sous licence MIT (`LICENSE`). Ne sont pas couverts :

- le nom, le logo, les affiches et l'univers du collectif Tartine Sauvage ;
- les bruitages et la musique ;
- la police Bungee (SIL OFL, chargée depuis Google Fonts) et le logo Google ;
- les marques citées ou dessinées dans le jeu, qui restent à leurs propriétaires.
