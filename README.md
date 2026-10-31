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
- Le doigt glisse n'importe où : la tartine suit le mouvement, 1,8 fois plus loin que le doigt, pour que le doigt ne la cache pas. Réglable dans Paramètres, Contrôles, « Sensibilité » (de 0,8 à 2,8, 1,8 au milieu ; gardé dans `cv-sensibilite`).
- Souris (31/10/2026) : sur un appareil qui a une souris, Paramètres propose « Glisser » (la souris bouge la tartine comme le doigt, avec la même sensibilité) ou « Viser » (la tartine va là où pointe la souris et le curseur disparaît pendant la partie ; `cv-souris`). Le mouvement reste découpé en petits pas comme pour le doigt : aller vite ne permet pas de traverser un couvert.
- La partie démarre avec la tartine là où elle volait sur l'accueil. Sur téléphone, un rond pulse en bas (`PUCK_LIFT` dans `scene.js`) pour montrer où poser le doigt.
- Rien n'arrive par le bas (le doigt cacherait les attaques). Les attaques de côté partent des 60 % du haut.
- Chaque attaque est annoncée 0,45 à 0,9 s avant par une pastille au bord de l'écran, jamais posée sur le chrono.
- Le rythme des attaques plafonne à 80 s, la vitesse des couverts à 150 s. Le plafond est volontairement bas : au-delà, c'est l'endurance qui départage (voir Équilibrage).
- Zones de touche : la tartine est un cercle de 26 px, chaque arme est faite de gélules (`parts` dans `projectiles.js`). Fourchette : depuis le 31/10/2026, à la demande d'Adrien, le manche a sa propre gélule de 8 px de large, calée sur le dessin (avant, une seule gélule de 12 px de large sur toute la longueur, plus large que le manche) ; la tête ne change pas. « Frôlé » quand la tartine passe à moins de 11 px.
- Frôlés : « Frôlé x2 », « x3 »… quand ils s'enchaînent à moins de 1,5 s, avec un son plus aigu à chaque cran (6 au plus). Chaque frôlé laisse une entaille dans la croûte, du côté où le couvert est passé (12 au plus). Aucun effet sur le score ni sur la zone de touche.
- Effets : le chrono flashe en jaune toutes les 10 s, les couverts rapides (dès 380 px/s) laissent une traînée, et le fond passe du bleu nuit au violet vers 60 s puis au rouge sombre à 120 s, au rythme de la vitesse des couverts (rouge plein à × 3, `SPEED_HOT`) (`HEAT` dans `palette.js`).
- Planètes du fond (`BODIES` dans `planets.js`, couleurs dans `SKY` de `palette.js`), en trois catégories : normales (planète violette à bandes et à anneau, planète verte à anneau, lunes et astéroïde à cratères ; depuis le 31/10/2026 elles ont un contour, et leurs anneaux une division comme Saturne), extravagantes (planète pancake et son pot de confiture, planète enceintes, deuxième planète enceintes, bleu canard aux terres ambrées : cinq haut-parleurs posés dessus qui pompent sur le beat, la planète qui bat avec eux et des ondes en arcs qui partent de deux côtés, comme sur la première, plus longues et plus épaisses en haut à gauche, du côté du plus gros haut-parleur) et drôles. Elles défilent par tours de huit places (`TOUR` dans `scene.js`) : cinq normales, deux extravagantes et une drôle, en alternant droite et gauche. Au lancement, on voit trois normales avant la première extravagante, puis une drôle deux planètes plus loin. Depuis le 31/10/2026 : avant, c'était six places (trois normales, deux extravagantes, une drôle) et le ciel s'ouvrait sur une extravagante, avec trois spéciales dans les quatre premières planètes, trop souvent selon les joueurs. Chaque place tire sa planète au hasard dans sa catégorie quand elle rentre par le haut, hors de l'écran, et on revoit une planète seulement après avoir vu toutes les autres de sa catégorie.
- Planètes drôles (`BODIES.rare`), une à chaque tour : Tung Tung Tung Sahur qui danse avec sa batte sur l'astéroïde (trois coups, puis une pause), lune en fromage (jaune beurre, trous creusés et entailles sur le bord) dont une souris grignote le bord, grille-pain rond en chrome (reflets, fentes rougeoyantes, molette, levier) dont les deux tartines (la silhouette de celle du jeu) sautent toutes les 6 s. Depuis le 30/10/2026, d'autres s'inspirent de la tenue et des succès : citrouille d'Halloween qui ricane, avec une tartine sorcière qui en fait le tour sur son balai ; lune de Méliès (Le Voyage dans la Lune, 1902, dans le domaine public) : un vrai visage qui grimace, l'obus planté dans l'œil d'où coule la crème, posée sur des nuages, qui cligne de l'autre œil et tressaille de temps en temps. Planète pirate (31/10/2026, refaite le même jour à la demande d'Adrien) : île à tête de mort avec palmiers et croix du trésor, anneau d'océan dont l'écume défile, galion qui fait le tour de l'anneau (derrière puis devant la planète) et tire au canon ; rien de One Piece. Sur l'accueil, toucher la citrouille ou la planète pirate donne un succès secret (`key` dans `BODIES`, `bodyAt` dans `scene.js`, `touchSky` dans `achievements.js`). Pas de personnages ni de designs protégés (films, mangas, jeux vidéo) : seulement des idées originales, des œuvres libres de droits ou des objets réels. En local, `?planetes=souvent` ne fait défiler que des planètes drôles.
- Étoile filante : de temps en temps (première entre 30 s et 3 min après l'ouverture du jeu, puis toutes les 2 à 4 min, menu compris), quelque chose traverse le fond en 9 s, chacun son tour dans un ordre au hasard. Une petite canette passe loin derrière les planètes et les étoiles, avec une traînée dorée, en tournant doucement : 8.6 Original (bleu nuit, loup bleu, gros 8.6 blanc au point rouge) ou Amsterdam Maximator (vert, armoiries, voilier blanc à coque dorée), redessinées d'après les photos produit. Attention, certaines photos de magasin sont délavées : vérifier les couleurs sur l'image seule. Dessinée comme les planètes (sans contour, opaque, seule la traînée est transparente) pour qu'on ne la prenne pas pour une arme. Passent aussi la Tesla rouge envoyée dans l'espace en 2018, avec son mannequin en combinaison au volant (sans logo, elle tourne lentement sur elle-même), et une soucoupe volante dont le petit extraterrestre fait coucou (elle file à l'horizontale en tanguant, ses lumières clignotent), et le père Noël (31/10/2026) : traîneau rouge, hotte avec un cadeau, deux rennes au galop et traînée d'étoiles dorées (`span` : plus large que les autres, réduit d'autant dans le Guide). Tout ce qui passe est dans `PASSERS` (`planets.js`, canettes dans `CANS`), le passage dans `scene.js` (`COMET_*`). En local, `?etoiles=souvent` la fait passer toutes les 4 à 6 s (pour tester seulement : sans ce lien, le vrai rythme).
- Mort : le jeu se fige 0,3 s, puis l'éclaboussure. Sous « Tartinée ! », l'arme qui t'a eu (« par un hachoir », « par un couteau au dentifrice ») : `by` dans `PROJECTILES`, `with` dans `SPREADS`.
- Garnitures : 9 tartinades dessinées sur la tartine (`TOPPINGS` dans `sprites.js`) : confiture, pâte à tartiner, miel et son abeille, ketchup en zigzag, dentifrice rayé, œuf au plat, sardine entière, slime qui a un œil, pâtée pour chien tartinée avec son odeur et sa mouche. Beurre et Nature (31/10/2026, la tartine sans rien dessus, demandée par Adrien) au départ : gratuites (`free` dans `SPREADS`), elles ne comptent pas parmi les garnitures à gagner. 1 attaque à couteaux sur 10 a un couteau garni : le frôler ou se faire tuer par lui débloque sa garniture (pas en entraînement). Une garniture gagnée est mise tout de suite. Toucher la tartine de l'accueil, ou une des deux flèches toujours affichées autour d'elle (31/10/2026), ouvre le choix. Quand une partie fait gagner un skin, « Essayer le skin » sur l'écran de fin ramène à l'accueil avec le choix ouvert (31/10/2026). Une astuce le dit tant qu'on ne l'a pas fait, puis « Nouveau ! Touche ta tartine pour l'essayer » quand un skin gagné n'a pas encore été vu (`cv-tenue-vue` : nombre de skins au dernier choix). Gardées sur le téléphone (`cv-garnitures`, `cv-garniture`, `cv-garniture-astuce`), purement visuel. En local, `?garnitures=toutes` dans l'adresse les débloque toutes.
- Tenue de la tartine (30/10/2026) : 3 emplacements en plus de la garniture, un objet de chaque à la fois (`slot` dans `GEAR` de `palette.js`, dessins `HATS`, `SIDES` et `BREADS` dans `sprites.js`). Chaque objet est la récompense d'un succès qui a un lien avec lui (champ `gear`) :
  - Chapeaux : bandeau de ninja (Insaisissable, frôlé x5), couronne (Tartine d'or), toque de chef (Tout le frigo), casque d'astronaute (Fidèle du Space), chapeau de pirate (secret À l'abordage : toucher la planète pirate sur l'accueil), bonnet de Noël (Joyeux Noël, jouer en décembre), auréole (Tartinée express), bonnet de nuit (En détente), oreilles de chien (Ouaf), chapeau de sorcière (secret Des bonbons ou un sort : toucher la planète citrouille sur l'accueil).
  - Côtés : boosters (Dorée à point, 90 s), couteau et fourchette (Tout vu), ailes de chauve-souris qui battent (secret Tartine de minuit : lancer une partie entre minuit et 3 h, à l'heure du téléphone), mains Six Seven (secret Six Seven : les deux mains en creux tiennent un 6 à gauche et un 7 à droite, et montent et descendent chacune leur tour, sans arrêt ; les chiffres sont dessinés à la main, pas avec la police, pour que le 7 ne ressemble pas à un « ? »).
  - Pain : pain de mie au départ, pain grillé (Bien grillée, 120 s), pain carbonisé (Tartine de légende, 150 s), brioche (Boulangerie, 50 parties), tartine sans croûte (Accro à la croûte, 100 parties : du pain de mie sans sa croûte). Seules les couleurs et les détails changent : même forme, même zone de touche. Hitbox (Ça passe crème, 20 frôlés dans une partie, ajoutée le 31/10/2026, pour ceux qui tryhardent) : une tartine ronde qui remplit pile la vraie zone de touche (le disque de `HIT_R`), croûte sur tout le bord, mie, garniture un peu réduite pour rester dedans ; réacteurs, côtés et chapeau suivent, à la même échelle (`ROUND_R`, `roundPath`). La zone de frôlé (`HIT_R + NEAR`) est une lueur moutarde qui s'efface vers l'extérieur, bordée de 14 miettes qui tournent lentement pile sur sa limite (`nearZone`, `NEAR_*` dans `sprites.js`). Première version du 31/10/2026 (tartine coupée au disque, cercle en pointillés) refaite le même jour à la demande d'Adrien.
  - Avant le 30/10/2026 : sorcière à 30 s, bonnet de Noël à 10 parties, boosters à 60 s puis 90 s. Ceux qui les avaient gagnés ainsi les perdent jusqu'à remplir la nouvelle condition. Même règle le 31/10/2026 : la sorcière passe de Tartine de minuit à la citrouille, le chapeau de pirate de Dans le top (qui ne donne plus d'objet) à la planète pirate.
  - Un objet gagné est mis tout de suite, même en pleine partie. Choix dans les flèches de la tartine de l'accueil : une ligne par emplacement (chapeau, côtés, pain) sous celle de la garniture, montrée seulement quand on a gagné au moins un objet de cet emplacement. Pendant le choix, le bas de l'accueil (Jouer, classement…) se cache pour laisser la place. Gardé sur le téléphone (`cv-accessoire` pour le chapeau, `cv-cotes`, `cv-pain`), purement visuel. En local, `?accessoires=tous` les débloque tous le temps de la page, et `?succes=tous` gagne pour de bon tous les succès (donc tous les objets) sur ce navigateur ; avec `&garnitures=toutes`, tout le jeu est débloqué.
- Fin de partie : « Encore 1,21 s pour passer X », X étant le joueur juste devant (soirée pendant une soirée, général sinon). Rien si tu es 1er, sans pseudo ou au-delà du 1 000e du général.
- Entraînement : bouton « S'entraîner » sur chaque attaque d'Infos. Seulement cette attaque : elle démarre à la vitesse de son heure d'arrivée, puis accélère comme en partie. Ne compte ni au classement, ni pour les succès, ni pour le record.

## Attaques

| Attaque | Dès | À retenir |
|---|---|---|
| Couteau visé | 0 s | Vise la tartine au moment de l'annonce. Tourne 1 fois sur 3 dès 25 s |
| Pluie de fourchettes | 3 s | 4 fourchettes, 1 de plus toutes les 15 s (8 dès 60 s) |
| Hachoir | 8 s | Tombe très vite au-dessus de la tartine, annonce longue (0,9 s). 2 à la suite dès 30 s, 3 dès 55 s, dans des colonnes voisines |
| Mur | 12 s | Rangée serrée avec un seul trou d'environ 100 px |
| Rouleau | 16 s | Traverse lentement par un côté. 2 à la suite dès 36 s, 3 dès 60 s |
| Éventail | 22 s | 3 couteaux en cône vers la tartine, 4 dès 38 s, 5 dès 54 s |
| Murs en série | 28 s | 2 murs d'affilée du même côté ou du haut (3 dès 60 s), trous d'environ 120 px, décalés de 90 à 140 px d'un mur à l'autre (jamais alignés). Chaque mur n'est annoncé que juste avant d'arriver. Joue seul : l'attaque suivante part quand le dernier mur a fait 20 % de sa traversée |
| Croix | 32 s | 4 couteaux en même temps vers la tartine |
| Couteau à pain | 38 s | Rebondit une fois sur un bord |
| Pluie en biais | 45 s | 7 à 8 fourchettes en diagonale, qui balaient l'écran d'un côté à l'autre |
| Double pluie | 54 s | 8 fourchettes (9 dès 60 s), à gauche et à droite en alternance |

- Vitesse des couverts : × (1,4 + t / 75), × 3 à 120 s, plafonnée à × 3,4 dès 150 s (`SPEED_START`, `SPEED_RAMP`, `SPEED_UNTIL` dans `field.js`). Délai entre deux attaques : 0,95 s moins 0,005625 × t, 0,5 s au plus court dès 80 s (`GAP_*` dans `sim.js`). Courbe du 30/10/2026, choisie avec le robot « humain » (voir Équilibrage), puis plafond de vitesse monté de 2,2 à 2,4 par Adrien après l'avoir testée (trop facile après 60 s). Le soir même, des joueurs faisaient 150 s : plafond monté à × 3 (120 s) et délai minimal à 0,45 s (75 s), début identique jusqu'à 60 s (voir Équilibrage). Puis Adrien : délai minimal de 0,5 s atteint à 80 s (nombre rond, un peu plus doux entre 30 et 80 s : 0,61 s à 60 s au lieu de 0,55 s), et vitesse des couverts sans limite. Le 30/10/2026 au soir, d'après les retours des joueurs (beaucoup trop rapide au-delà), vitesse plafonnée à celle de 150 s. Avant : × 1 à × 2,6 à 80 s, et 1,25 s à 0,42 s dès 52 s. Début trop calme, mur de difficulté entre 40 et 60 s, puis un plafond si haut que la chance décidait.
- Jamais plus de 3 fois la même attaque d'affilée, sauf si c'est la seule possible (couteau visé avant 3 s). Croix, murs en série et double pluie ne sortent jamais deux fois de suite. Jamais de mur juste après des murs en série, ni l'inverse (même `kin`). Pas de mur ni de murs en série tant qu'un rouleau est annoncé ou à l'écran, et l'inverse (`shuns`) : un rouleau dans le trou d'un mur le bouchait presque. Si les murs en série sont tirés pendant une annonce, ils attendent qu'elle soit partie (rien d'autre n'est annoncé entre-temps), et l'attaque suivante ne part que quand leur dernier mur a fait 20 % de sa traversée (`CALM_PASS` dans `sim.js`), avec une « durée » (`cost`) de 1. Il reste environ 1 s sans nouvel objet après le dernier mur entre 28 et 60 s, puis 0,86 s, à peine plus que l'écart normal (0,8 à 0,9 s). Historique du 30/10/2026, Adrien trouvant l'attente trop longue à chaque fois : d'abord jusqu'à ce que le dernier mur quitte l'écran (environ 2 s de vide), puis 40 % de sa traversée avec une durée de 4 (1,2 à 1,8 s, la durée de 4 imposait elle-même l'attente avant 60 s). Avant aussi, les murs en série étaient écartés à chaque annonce en cours, et après 60 s ils ne sortaient presque plus.
- 1 attaque à couteaux sur 10 a un couteau garni (voir Garnitures).
- Fouet mis de côté (jugé trop facile) : `lab: true` dans `attacks.js` et `projectiles.js`, visible seulement dans l'admin. Enlever `lab` pour le remettre.
- Couloir (deux murs de deux côtés, 46 s) mis de côté de la même façon : trop proche des murs en série, on pouvait le prendre pour un bug.
- Chances, vitesses et délais de chaque attaque : `attacks.js`. Le calendrier est dans le jeu (Infos, onglet Attaques).
- Infos, onglet Attaques (refait le 31/10/2026 après une critique de design ; avant, tout était ouvert et il fallait 10 écrans et demi pour le parcourir sur téléphone) : une carte repliée par attaque, avec son nom et son heure d'arrivée. Une seule s'ouvre à la fois, avec son aperçu animé (seul l'aperçu ouvert tourne), ses pastilles et « S'entraîner ». En dessous, Progression (les paliers de difficulté, sans les arrivées déjà sur les cartes) et Règles. Onglet Armes : la taille réelle avec la zone de touche, puis les variantes rares en gros plan sur la lame (`spreadCard` dans `catalog.js`). Onglet Guide (31/10/2026, le wiki du jeu demandé par Adrien, `guide.js`) : mêmes cartes repliables, dessin compris seulement à l'ouverture, pour Frôlés, Garnitures, Accessoires, Succès, Le ciel, Classements, Soirées et Compte. Garnitures, Accessoires et Succès affichent ce que le joueur a gagné (« 3 / 9 ») et grisent le reste ; un accessoire d'un succès secret pas encore trouvé dit seulement « Succès secret ». Le ciel montre les planètes drôles et extravagantes et tout ce qui passe en étoile filante (`name` dans `BODIES` et `PASSERS` de `planets.js`). Les onglets d'Infos ont moins de marge pour tenir à quatre sur un téléphone. Textes d'Infos (descriptions et paliers dans `attacks.js`, le reste dans `catalog.js` et `guide.js`) écrits pour des joueurs, à la demande d'Adrien : tutoiement, phrases courtes, « hitbox », « skin », « max ».
- Les onglets (Infos, Classement, Paramètres) font au moins 44 px de haut, la taille minimale pour un doigt.
- Le trou des murs en série par le haut pouvait sauter d'un bord à l'autre entre deux murs : 27 morts pour 100 séries chez un débutant, contre 5 par les côtés. Limité à 140 px depuis le 30/10/2026, comme par les côtés. Depuis le 31/10/2026, chaque trou se décale aussi d'au moins 90 px (`SERIES_MOVE`), vers un côté tiré au hasard (l'autre si le bord est trop près) : les joueurs trouvaient trop facile un trou presque aligné avec le précédent. Mesuré : 0 série refusée par le solveur à 30 s et à 65 s, 0 mort pour le robot parfait.

## Équité

- Avant chaque attaque, le solveur simule les 3,5 s suivantes (jusqu'à 4,5 s si l'attaque dure plus longtemps, comme les murs en série) avec tout ce qui est en vol. S'il ne trouve pas de chemin pour la tartine, en comptant 0,1 s de réaction, l'attaque est remplacée (5 essais au plus).
- Le modèle est prudent (grille de 12 px, doigt à 360 px/s au plus, marge de 11 px autour des couverts) : si le robot passe, un humain peut passer.
- Le solveur range chaque ligne de sa grille (30 colonnes) dans un nombre de 32 bits. Depuis le 30/10/2026, il calcule d'un coup toute la zone balayée par chaque couvert pendant un pas de 1/30 s (avant : 5 instantanés par pas, avec de petits trous possibles entre deux instantanés quand les couverts vont vite), et fabrique ses masques de bits par décalages (avant : `2 **`, qui prenait la moitié du temps). Résultat : environ 6 fois plus rapide (0,15 ms par vérification sur un PC, 0,8 ms au pire), mêmes décisions sur 8 853 vérifications enregistrées en partie, zone balayée identique à un calcul avec 256 instantanés sur 20 000 couverts tirés au hasard. Le chemin du robot (tests) garde ses 5 instantanés : trajets identiques.
- Un geste très rapide ne fait pas traverser un couvert : le trajet de la tartine est vérifié tous les 6 px. Un déplacement absurde (infini, ou plus de 10 000 px d'un coup) est borné pour ne pas figer le jeu.
- `npm test` fait jouer le robot 100 parties de 150 s : 0 mort attendu. À relancer après un gros changement des règles, pas pour un petit réglage.

## Équilibrage

Le robot d'équité (`npm test`) joue parfaitement : il dit si le jeu est faisable, pas s'il est bien dosé. Pour le dosage, on fait jouer un robot « humain » à toute une population de niveaux. Les outils sont dans `test/equilibrage/`.

**Le robot humain** (`playHuman` dans `jeu.mjs`)
- Il ne voit une annonce qu'après son temps de réaction, il se déplace à vitesse limitée, et il a des moments d'inattention de 0,4 s où il ne bouge plus.
- Un niveau de 0 à 1 règle les trois (`profileOf`) : réaction de 0,33 s à 0,18 s, vitesse de 240 à 480 px/s, une inattention toutes les 6 s en moyenne au niveau 0, toutes les 20 s au niveau 1.
- Il choisit son chemin avec le solveur du jeu, à partir de ce qu'il voit.
- Limites : il ne se fatigue pas au fil de la partie, il voit tout parfaitement et son doigt ne cache rien. Les chiffres servent à comparer deux versions entre elles, pas à prédire les temps réels. Le vrai repère, c'est le classement en prod.

**Les commandes**

| Commande | Ce qu'elle mesure | Durée |
|---|---|---|
| `npm run equilibrage` | 80 joueurs du niveau 0 au niveau 1, 5 parties chacun, sur deux séries de tirages : part du niveau dans le score, surprises, médianes par niveau, risque de mort par tranche de 20 s | environ 10 min pour deux versions |
| `npm run equilibrage:attaques` | Morts pour 100 lancées de chaque attaque, pour un débutant (niveau 0,1), un moyen (0,5) et un fort (0,9). Murs en série séparés entre haut et côtés | environ 10 min |
| `npm run equilibrage:vides` | Temps sans nouvel objet avant et après des murs en série, comparé à l'écart normal entre deux attaques | 1 min |
| `npm run equilibrage:invariants` | Robots immobile, nerveux, collé aux bords et parfait : valeurs impossibles, couverts oubliés, règles de tirage, couvert traversé sans toucher. Sort en erreur au moindre problème | 1 à 3 min |

**Lire les chiffres**
- Part du niveau dans le score : la part des écarts de temps qui vient du joueur plutôt que du hasard (corrélation intra-classe sur le logarithme des temps). Plus c'est haut, moins la chance décide. Entre deux séries de tirages, ça bouge d'environ 3 points : un écart plus petit ne prouve rien.
- Plus faible bat plus fort : la part des duels où un joueur plus faible d'au moins 0,2 niveau a un meilleur record sur ses 5 parties.
- Risque moyen par tranche : la chance de mourir dans ces 20 s pour un joueur moyen (niveau 0,3 à 0,7) encore en vie. Une montée brutale, c'est un mur de difficulté. Une ligne plate, c'est le plafond.
- Morts pour 100 lancées : une attaque très au-dessus des autres est un piège, une attaque proche de 0 sert de respiration.

**Tester un réglage**
1. `npm run equilibrage:variante -- essai` copie le coeur du jeu dans `.equilibrage/essai` (hors git).
2. Changer les réglages dans cette copie.
3. `npm run equilibrage -- public/js/game .equilibrage/essai` compare les deux versions. Les autres commandes acceptent aussi une copie : `GAME=.equilibrage/essai npm run equilibrage:attaques`.
4. Si c'est mieux, reporter le changement dans `public/js/game`, puis `npm test` (0 mort) et `npm run equilibrage:invariants`.
- Pour comparer avec une ancienne version : copier ses 5 fichiers de `public/js/game` depuis git dans `.equilibrage/<nom>` (`git show <commit>:public/js/game/sim.js > .equilibrage/<nom>/sim.js`, pareil pour les autres).

**Quand refaire un point** : seulement de temps en temps, quand beaucoup de règles changent ou quand la progression paraît mal dosée en voyant les joueurs jouer. Pas à chaque modification, ni pour un petit réglage (choix d'Adrien).

**Point du 30/10/2026** : nouvelle courbe choisie par Adrien
- Retour des premiers joueurs : le début est trop calme, et le record en prod (82,8 s) tient surtout de la chance, puisque 80 s est à peine le moment où le niveau se stabilise.
- Idée d'Adrien : plus dur dès le début, une montée plus douce, et un plafond plus bas pour que l'endurance départage.
- Mesuré : avant, c'était calme jusqu'à 40 s, puis venait un mur de difficulté entre 40 et 60 s, puis un plafond si haut que chaque tranche de 20 s tuait un tiers des joueurs moyens.

| | Avant | Depuis le 30/10 |
|---|---|---|
| Part du niveau dans le score | 41 % | 47 % |
| Plus faible bat plus fort | 5,4 % | 3,4 % |
| Médianes des niveaux 1 à 5 | 31, 50, 69, 99, 132 s | 20, 35, 85, 116, 157 s |
| Risque d'un joueur moyen (0-20, 20-40, 40-60, 60-80 s) | 5, 11, 32, 35 % | 9, 18, 19, 25 % |
| Parties qui atteignent 300 s | 3 % | 6 % |

- Écartés : une courbe plus douce qui plafonne à 80 s (plus de chance, 39 %), une vitesse maximale plus haute (aucun effet), un plafond très bas atteint à 60 s (moins stable d'un tirage à l'autre), un préavis de 0,9 s pour les murs en série (moins efficace que limiter le saut du trou).
- Morts pour 100 lancées avec la nouvelle courbe, pour un débutant, un moyen et un fort : murs en série par le haut 35, 3 et 0,6 ; croix 11, 2 et 0,6 ; double pluie 9,5, 1,7 et 0,9. Les autres attaques restent sous 7 chez le débutant. Pluie en biais et couteau à pain tuent presque jamais (respirations).
**Point du 30/10/2026 au soir** : des joueurs faisaient 150 s. Adrien trouvait le niveau à 60 s bon, mais le plafond trop bas. Comparaison avec début identique jusqu'à 60 s :

| | Plafond × 2,4 et 0,55 s | × 3 et 0,45 s (retenu, puis ajusté par Adrien) | × 2,8 et 0,48 s | Vitesse sans limite et 0,42 s |
|---|---|---|---|---|
| Médiane des meilleurs (niveau 5) | 165 s | 152 s | 135 s | 129 s |
| Risque d'un joueur moyen entre 60 et 80 s | 26 % | 31 % | 31 % | 31 % |
| Parties à 300 s | 6,6 % | 4,6 % | 5,9 % | 3,4 % |

- Les trois durcissent la fin de partie de la même façon : les écarts entre elles restent dans le bruit de mesure. Le robot fort meurt surtout de ses inattentions, donc la vitesse seule pèse peu sur lui.

- À surveiller : les murs en série par le haut restent le piège n°1 des débutants. Avec 0,7 s de préavis, un débutant ne parcourt qu'environ 100 px, alors que le trou peut se décaler de 140 px.

## Soirées et classements

- Pas de compte : le téléphone garde un jeton et son profil pour toujours. Le même téléphone qui retape son pseudo retrouve son compte.
- Pseudo unique sur tout le jeu, de 2 à 16 caractères : lettres latines (accents, œ, æ, ß et ø permis), chiffres, espaces, tirets. Majuscules et accents ne comptent pas pour l'unicité. Il se change dans Paramètres, record et place suivent.
- Trois classements : celui de la soirée (pour le lot), et deux généraux permanents, Mobile et PC. À égalité, le premier à avoir fait le temps passe devant.
- Mobile ou PC (30/10/2026, des joueurs sur PC faisaient des scores bien meilleurs) : chaque partie enregistre l'appareil d'après ce qui a vraiment bougé la tartine, la souris (PC) ou le doigt (Mobile). Sans geste, le jeu suppose d'après l'écran (tactile ou non). Une partie sur PC compte seulement au général PC : jamais pour la soirée, ni pour ses succès « Dans le top » et « Tartine d'or ». L'accueil d'un PC le dit pendant une soirée. Les records d'avant le 30/10/2026 sont rangés en Mobile. Jusqu'au 31/10/2026, un compte qui terminait une partie sur PC sans avoir jamais joué sur téléphone voyait son ancien record passer en PC : règle retirée, car un compte peut maintenant servir sur plusieurs appareils. bLOOons a été basculé à la main le 30/10/2026 (sauvegarde de ses valeurs d'avant dans `sauvegardes/`). Les classements d'anciennes soirées ne bougent pas. Adrien pense tout remettre à zéro avant la soirée. Limite : un tricheur décidé peut faire passer son PC pour un téléphone dans son navigateur.
- Écran Classement : les 30 premiers, podium or, argent et bronze, puis ta place exacte si tu n'es pas dedans. La liste défile (remis le 31/10/2026, à la demande d'Adrien ; du 30/10 au 31/10 elle ne défilait pas et se coupait aux 10 premiers ou moins). Ta ligne reste toujours visible, collée en haut ou en bas de la liste quand elle sort de l'écran. Changer d'onglet remonte en haut.
- L'écran Classement a les onglets Soirée (quand une soirée est annoncée, en cours ou vient de finir), Mobile et PC. Il s'ouvre sur la soirée en cours, sinon sur Mobile, et toujours sur PC depuis un PC. Quand une soirée est annoncée mais pas commencée, l'onglet Soirée donne son nom et « Prochaine soirée lundi 02/11 à 20h00 » (plus sur l'accueil).
- Fiche joueur (31/10/2026) : toucher une ligne du classement (la sienne comprise) ouvre la fiche du joueur, « Retour » ramène au classement. En haut, son pseudo, puis sa tartine qui flotte avec tous ses skins (garniture, chapeau, côtés, pain). Sous la tartine, toujours deux cases, Mobile et PC : la place au classement en grand (aux couleurs du podium : or, argent, bronze) et le record, ou des tirets s'il n'a pas joué sur cet appareil. En dessous : Parties (jouées, temps de jeu, la somme de toutes ses parties, soirées jouées, meilleure place en soirée, meilleur frôlé), Progression (ses 10 derniers records battus en barres, en secondes : chaque partie qui a battu son record d'alors, sur l'appareil de son dernier record, ou l'autre s'il n'y en a qu'un ; toutes les barres en jaune, le chiffre du record actuel encadré), Collection (succès et objets débloqués sur le total). Tout en bas, « Depuis le … » et sa dernière partie. Pendant le chargement, des cartes vides gardent la place ; hors ligne, un bouton « Réessayer ». Sur un écran de plus de 900 px : la tartine et les places à gauche, les cartes à droite. Au clavier, Entrée ouvre la fiche et « Retour » rend la main à la même ligne. Meilleur frôlé : la plus longue série de frôlés d'une partie (« Frôlé x12 »), envoyée avec le score (colonne `combo` de `runs`, de 0 à 99, non vérifiée). Les parties d'avant le 31/10/2026 n'en ont pas : « - » tant que le joueur n'a pas rejoué. Code : `profile.js`, route `GET /api/players/:id` (gardée 10 s en mémoire par joueur, sauf un joueur introuvable, `card` dans `routes/player.ts`). Un joueur retiré n'a pas de fiche.
- La tenue, le nombre de succès et les objets débloqués sont sur le téléphone : il les envoie au serveur (colonne `look` de `profiles`, JSON vérifié par `cleanLook`) au début de chaque partie, et 1,5 s après un changement de tenue ou un succès (`PUT /api/me/look`, seulement si ça a changé). Un joueur qui n'a pas rouvert le jeu depuis le 31/10/2026 a une tartine nature et pas de carte Collection. Rien n'est vérifié : un tricheur peut afficher n'importe quel objet, sans effet sur les classements.
- Une seule soirée à la fois, créée à l'avance dans l'admin pour être annoncée dans le jeu.
- Les parties commencées avant la fin comptent encore 5 min après. Le gagnant n'est annoncé (« Bravo X ! », succès Tartine d'or) qu'après ces 5 min.
- Les téléphones relisent le classement toutes les 10 s (30 s sur l'accueil), et plus du tout écran éteint. Le serveur le garde 10 s en mémoire, le général 60 s pendant une soirée : jusqu'à 20 s de retard (70 s pour le général). Ta place après une partie est à jour tout de suite.
- En base : `profiles` (joueurs, record Mobile `best` et record PC `pc_best`, tenue `look`, progression `progress`), `sessions` (une clé par appareil connecté, hachée ; les colonnes `token` et `client_id` de `profiles` ne servent plus), `links` (codes de liaison en cours, hachés), `entries` (record par soirée), `runs` (parties, avec `device`, meilleur frôlé `combo`, `invalid` à 1 pour une partie retirée des records, index `runs_player` pour les fiches), `events` (soirées). Migrations `0007_fiche` et `0008_records` à appliquer en ligne avant le déploiement de la fiche, `0009_comptes` avant celui des sessions, `0010_liaison` avant celui du code de liaison.
- Nettoyage du 31/10/2026, à la demande d'Adrien (sauvegardes avant dans `sauvegardes/`) : le classement de la soirée Space Tartinade #3 a été vidé. Elle avait été ouverte par erreur le 29/10, puis décalée au 07/11 : 8 lignes et 301 parties, retirées de la soirée mais gardées au général. Les records faits sur le réglage trop facile (parties commencées le 30/10 entre 17h07 et 17h41, vitesse plafonnée à × 2,4, quand des joueurs tenaient 150 s) ont été recalculés sans ces parties : bLOOons PC 151,97 → 142,79 s, Alexisss 73,72 → 52,09 s, Lapin 66,21 → 66,10 s, et alexis et alrd n'ont plus de record (leurs seules parties). Le serveur refuse une partie lancée avec une ancienne version, donc l'heure de début suffit à savoir sur quel réglage elle a été jouée. Les parties restent dans l'historique, marquées `invalid` par la migration `0008_records` : la Progression des fiches les ignore.

## Triche et sécurité

- Le serveur refuse un score plus long que le temps réellement écoulé (5 s de marge) ou au-delà de 15 min. Un score renvoyé deux fois ne compte qu'une fois.
- Signalés dans l'admin : le 1er d'un classement quand il dépasse le 2e de plus de 30 % (et fait au moins 60 s), et une partie ralentie ou mise en pause (plus de 15 % et 15 s de temps réel en trop). Avant le 30/10/2026 : tout record de 90 s ou plus, devenu banal avec la nouvelle courbe. L'admin a les onglets Soirée, Mobile et PC.
- Faille connue : un faux score plausible (vers 60 s) passe inaperçu. Rejouer les parties à partir des gestes pour la bloquer : écarté par Adrien le 31/10/2026.
- Jetons des joueurs, identifiants des téléphones, connexions et invitations admin : rangés hachés (SHA-256). Une copie de la base ne permet pas de se faire passer pour quelqu'un.
- Limites : 20 inscriptions par minute et par téléphone, 600 par minute et par adresse IP (tout le lieu partage souvent la même sur le wifi). Une inscription au pseudo invalide ne compte pas.
- Admin : 30 échecs par minute et par adresse IP. Une bonne clé ou une bonne invitation passe toujours : elles sont bien trop longues pour être devinées, et un invité malveillant ne peut pas bloquer la connexion des admins.
- 10 débuts de partie par 10 s et 5 changements de pseudo par minute, par joueur.
- Un joueur retiré ne monte plus, ni au général ni dans le classement de la soirée.
- En-têtes de sécurité (`public/_headers`) : pas de script externe, pas d'affichage dans le cadre d'un autre site.

## Admin

- Accès : Paramètres, onglet Admin, sur un téléphone connecté. Ou `/admin`, ou 5 appuis rapides sur « Collectif Tartine Sauvage ».
- Premier accès avec la clé admin (`cle-admin.txt`) : elle crée un compte propriétaire et reste la clé de secours.
- Le propriétaire invite : prénom et rôle, puis un lien à usage unique valable 48 h. Dans l'appli installée, on colle le lien dans « Lien d'invitation reçu ».
- Rôles : propriétaire (soirées, joueurs, équipe) et admin (soirées, joueurs). Chaque téléphone connecté peut être retiré, sauf le dernier propriétaire. Le retirer annule aussi les invitations qu'il a créées et pas encore utilisées. Une connexion inutilisée pendant 30 jours expire.
- Tableau de bord : soirée (créer, renommer, changer début et fin), classements soirée et général, bandeau rouge des records à vérifier, « Retirer » un joueur de tous les classements, écoute des bruitages.
- Les nouveaux pseudos des 15 dernières minutes apparaissent dans la liste même sans partie : on peut retirer un pseudo déplacé affiché sur l'écran géant.

## Écran géant

- `/ecran`, en paysage : top 10 de la soirée (du général hors soirée) à gauche, QR code et nombre de joueurs à droite.
- En haut : compte à rebours de fin ou de début. Après la soirée, « Résultats dans » pendant les 5 min où les dernières parties comptent encore, puis « Bravo X ! ».
- Fil en direct : nouveaux records et nouveaux pseudos des 15 dernières minutes (`GET /api/feed`).
- Panneau « Nouveau n°1 » en grand pendant 6 s quand un joueur bat le temps du 1er (pas quand le 1er est retiré).
- « Plein écran » empêche la mise en veille. Après une mise en ligne, la page se recharge seule, sauf en plein écran : elle attend qu'on en sorte, pour ne pas perdre le plein écran pendant la soirée.

## Son

- Musique : `public/music/theme.m4a` (ou `.mp3`), hors git pour les droits et le poids : à remettre avant de déployer depuis un autre PC. En prod : « Roundabout » de Blacklolita, en attendant les morceaux des collègues. Demander l'accord de l'artiste avant une diffusion plus large.
- Elle ne joue qu'en partie et repart du début à chaque partie, pour suivre la montée de la difficulté. Hors partie, seulement 2 s d'aperçu quand on la rallume ou qu'on lâche le curseur.
- Coupée et en boucle : elle joue jusqu'à 83,1 s (la voix finit de retomber), saute à la montée de 131,9 s qui mène au second passage énergique, puis reboucle sur la montée après 208,7 s. Coupes calées sur le tempo (172 BPM) et les débuts de mesure, (`MUSIC_PARTS` dans `audio.js`). Le morceau est décodé une fois au lancement, ses passages recollés en mémoire avec un fondu de 15 ms aux jointures, puis joué en boucle à l'échantillon près par une seule source (`stitch`) : plus aucun saut. Approximatives en attendant une version montée par un DJ.
- À la mort, elle passe « sous l'eau » puis s'éteint (2,5 s), programmé sur l'horloge audio.
- Moteur refait le 31/10/2026 après une analyse des bugs sur iPhone (musique qui partait au menu, impossible à couper, qui ne revenait pas, qui saccadait) : plus d'élément `<audio>`, tout passe par Web Audio. iOS relançait tout seul un `<audio>` après un appel, depuis le centre de contrôle ou les AirPods, chaque saut dans le morceau faisait un trou, et le mode audio du téléphone changeait à chaque partie. Maintenant : un seul état voulu (partie en cours, musique allumée, page visible, ou aperçu), recalculé à chaque évènement (`reconcile`) ; fondus et étouffement sur l'horloge audio ; volume et coupure sur un gain permanent. `navigator.audioSession` en « ambient » (choix d'Adrien, comme la plupart des jeux) : sur iPhone, le bouton silencieux coupe tout le jeu, et la musique d'une autre appli (Spotify) continue par-dessus. Ce mode a un bug connu d'iOS (contexte qui ne repart pas après l'arrière-plan, bug WebKit 281955) : rattrapé par la surveillance du contexte, recréé au toucher suivant. « playback » ferait l'inverse (son même en silencieux, Spotify en pause). Mémoire : environ 60 Mo pour le morceau décodé, pic d'environ 150 Mo pendant le décodage. Le morceau est toujours téléchargé en entier (le serveur ne sert pas les demandes « Range »).
- Recalage sur le chrono : seulement au-delà de 1,5 s d'écart, au plus toutes les 5 s, par un fondu de 50 ms (`DRIFT`, `RESYNC_S`). La musique n'est pas encore calée sur les attaques : mieux vaut un petit décalage qu'un saut.
- Règle des navigateurs : le son ne démarre qu'après un vrai toucher. Le contexte audio est surveillé : bloqué, figé ou réveil refusé (bugs connus d'iOS, surtout au retour d'arrière-plan et dans l'appli installée), il est recréé au toucher suivant. En arrière-plan, la musique s'arrête et le contexte est suspendu.
- Crédits (Infos, onglet Crédits, `renderCredits` dans `catalog.js`) : Collectif (Tartine Sauvage, lien Instagram, `CREW_URL`), Développeur (Adrien Morand, lien LinkedIn, `DEV`), Musique et Bruitages.
- Changer de musique : remplacer le fichier, mettre à jour `MUSIC_CREDIT` et `MUSIC_PARTS` (`[[0, durée]]` pour tout jouer en boucle) dans `audio.js`, puis `npm run deploy`.
- Bruitages Mixkit dans `public/sfx/` (départ, frôlé, mort, record, 1re place). Licence gratuite d'après la FAQ Mixkit, texte officiel à relire avant une diffusion hors soirée. Changer : remplacer le fichier, ou une ligne dans `SOUNDS` (`audio.js`).
- Volumes Musique et Bruitages dans Paramètres. Curseur à 0 : silence, sans aperçu. Sur iPhone, le bouton silencieux coupe tout le jeu (mode « ambient »).
- Diagnostic du son (31/10/2026, `diag.js`) : `?diag=son` affiche un panneau (contexte audio, musique, niveau réel dans le circuit) et tient le journal de tout ce que fait le son. En local, le journal part en direct vers le serveur de dev (`POST /api/diag`, lignes `[son]` du terminal), pour suivre un téléphone sur le wifi (`http://192.168.1.92:8787/?diag=son` chez Adrien). Sur iPhone, en prod, le jeu envoie seul jusqu'à 4 rapports par session : ses 2 premières parties, et les anomalies (musique hors partie, silence en partie, contexte figé, bloqué ou réveil refusé). Table `sound_reports` (date, type, version, appli installée ou non, navigateur, 150 dernières lignes du journal), gardée 14 jours, sans pseudo ni identifiant, 5 rapports par minute et par adresse IP. Lire : `npx wrangler d1 execute croute-que-croute --remote --command "SELECT created_at, kind, standalone, ua FROM sound_reports ORDER BY id DESC LIMIT 20"`. Tester sur un vrai iPhone sans Mac : impossible sur le PC (le WebKit de Playwright sous Windows n'a pas Web Audio) ; BrowserStack Live transmet le son d'un vrai iPhone (compte à créer).
- Pas de son sur les annonces d'attaque : ça avantagerait ceux qui jouent avec le son.

## Succès

- 27 succès en 5 familles (temps de cuisson, frôlés et découvertes, garnitures, assiduité et soirées, secrets) : liste et conditions dans `achievements.js`.
- Un secret pas encore trouvé montre « ??? » et un indice (`hint`).
- Badge « Nouveau » sur les succès gagnés depuis la dernière visite de l'écran (`seen` dans `cv-succes`).
- Un succès qui donne un objet de tenue l'écrit sous sa condition (« Débloque : … »), même pour un secret pas encore trouvé.
- Frôlés : « Insaisissable », faire un frôlé x5 (5 frôlés à moins de 1,5 s d'écart), a remplacé « Ça passe » (5 frôlés dans une partie) le 30/10/2026. Très dur : sur 300 parties du robot, x3 dans 10 % des parties, x4 dans 2 %, x5 jamais (un humain qui cherche les frôlés fait mieux). « Ça passe crème » (20 frôlés dans une partie) reste, et débloque la Hitbox depuis le 31/10/2026.
- Dates : « Joyeux Noël » (jouer en décembre) et le secret « Tartine de minuit » (lancer une partie entre minuit et 3 h), d'après l'heure du téléphone.
- Secrets du ciel (31/10/2026) : « Des bonbons ou un sort » et « À l'abordage », toucher la citrouille ou la planète pirate quand elle passe sur l'accueil.
- Temps de cuisson : 10, 30, 60, 90, 120 et 150 s (« Tartine de légende », la vitesse maximale). Avant le 30/10/2026 : 10, 20, 30, 45, 60 et 80 s, devenus trop faciles avec la nouvelle courbe. Les succès 20, 45 et 80 s déjà gagnés disparaissent du compte.
- Secret « En détente » : rester 3 s sans bouger (5 s avant le 30/10/2026 : un joueur immobile survivait 5 s dans 0 % des cas, 3 s dans 5 à 15 %).
- Garnitures : 1, 4 puis toutes gagnées. Le secret « Ouaf » : se faire tartiner par un couteau à la pâtée pour chien.
- Secret « Six Seven » (31/10/2026) : finir une partie à 67 s, peu importe les centièmes (de 67,00 à 67,99 s). Il donne les mains Six Seven.
- Gardés sur le téléphone (`cv-succes`), sans effet sur le classement, et copiés sur le serveur depuis le 31/10/2026 (`progress` dans `profiles`) avec les attaques vues et les garnitures débloquées. À chaque chargement du classement, le téléphone envoie les siens avec la tenue (`PUT /api/me/look`) ; le serveur les réunit à ceux des autres appareils du compte (date la plus ancienne pour un succès) et renvoie le total, que le téléphone ajoute sans fête. La tenue portée et les réglages restent propres à chaque appareil. Sur iPhone, Safari et l'appli installée ne partagent pas leurs données locales.
- Rattrapage (31/10/2026) : un succès ne se gagnait que pendant la partie, donc jamais après coup. Un record fait avant l'ajout d'un palier (le 94 s d'Adrien, fait le 30/10 à 17h51, avant le succès des 90 s ajouté à 18h37) ou sur un autre téléphone ne donnait rien. Maintenant le jeu rattrape ce que le serveur sait : les temps de cuisson d'après le meilleur record (Mobile ou PC), à chaque lecture du classement, et une fois à l'ouverture, d'après la fiche du joueur, 3 soirées, top 10 et 1er d'une soirée finie, et les secrets « Tartinée express », « Chiffre rond » et « Six Seven » d'après ses parties enregistrées (`feats` de `GET /api/players/:id`, `onHistory` dans `achievements.js`). Un objet rattrapé est mis seulement si son emplacement est vide. Les autres succès (frôlés, attaques vues, garnitures, en détente, la nuit, Noël, Ouaf) restent sur le téléphone : le serveur ne les connaît pas.
- Le nombre de parties prend le plus grand entre le compteur du téléphone et celui du serveur.

## Appli et réseau

- Installable : bouton Installer sur Android, Partager puis « Sur l'écran d'accueil » sur iPhone. Le jeu s'ouvre sans réseau s'il a déjà été ouvert une fois.
- Compte sur plusieurs appareils (31/10/2026) : Paramètres, « Autre appareil », « Afficher mon code » montre un QR code et un code de 8 caractères (sans 0, O, 1, I ni L), valable 10 min et une seule fois ; un nouveau code annule l'ancien, et un code expiré est remplacé tant que l'écran reste ouvert. Si la demande échoue (pas de réseau, trop de codes), l'écran réessaie toutes les 20 s. Sur le nouvel appareil, scanner le QR avec l'appareil photo ouvre le jeu avec le code déjà rempli, il reste à toucher « Connecter » (`#lier=` dans l'adresse, jamais envoyé au serveur ; pas de connexion automatique, pour qu'un lien reçu ne branche pas quelqu'un sur le compte d'un autre sans qu'il le voie), ou bien « J'ai déjà un compte » sur l'accueil puis taper le code (minuscules et espaces acceptés). Chaque appareil a sa propre clé (`sessions`), les succès et garnitures suivent par la progression gardée sur le serveur. Essais limités à 20 par minute et par adresse IP, 5 codes par minute et par compte. Code : `account.js`, `routes/link.ts` (table `links`, codes hachés), QR fabriqué par le serveur avec la bibliothèque `qrcode` et dessiné par le téléphone. Sur iPhone, l'appli installée ne partage pas ses données avec Safari : y taper le code plutôt que scanner. Fusion : un appareil déjà connecté à un autre compte tape le code dans Paramètres, « Autre appareil », « J'ai un code » (ou scanne le QR, qui ouvre les Paramètres). Le jeu demande d'abord « Réunir « B » avec « A » ? » sans utiliser le code, puis « Réunir » fait tout en une fois sur le serveur : on garde le compte qui a affiché le code (A), avec le meilleur record Mobile et le meilleur PC des deux (avec leur date ; à égalité, le plus ancien, qui passe devant au classement), les parties additionnées, la plus ancienne date d'inscription, les soirées réunies (meilleur score et parties additionnées si les deux ont joué la même), les succès et garnitures réunis ; les parties et tous les appareils de B passent sur A, et le compte B est supprimé, son pseudo redevient libre. Refusée si l'un des deux comptes est retiré du classement. L'appareil qui a fusionné récupère tout de suite les succès et garnitures réunis (la synchro repart quand le compte change) ; celui qui a affiché le code les récupère en revenant de l'écran du code, ou à la relance. L'écran du code ne voit pas qu'il a été utilisé : il reste affiché jusqu'à Retour. « Déconnecter les autres » (même carte, avec confirmation) sort tous les autres appareils du compte et annule le code en cours (`DELETE /api/me/devices`, 5 par minute et par compte) : si quelqu'un a utilisé ton code avant toi, il revient au choix du pseudo, et son ancien appareil ne peut plus reprendre ton pseudo. Boutons « Copier le code » sous le code et « Copier le lien » sur l'écran du QR du jeu (31/10/2026), avec une copie de secours si le presse-papiers est refusé (`copy` dans `settings.js`).
- Chaque `npm run deploy` crée une version. Le jeu se recharge seul quand elle change, jamais en pleine partie. Le serveur refuse l'inscription et le début de partie d'une ancienne version.
- Une partie ne compte que si le réseau passe au départ (la demande abandonne après 8 s). Elle compte aussi quand on touche Jouer avant que le classement soit chargé, si le téléphone a déjà un compte. À la fin, l'envoi du score réessaie pendant 2 min (« Envoi en attente… »), même si on ferme le jeu ou si le serveur a une erreur passagère. Renvoyer le score d'une partie déjà enregistrée redonne la même réponse, record et N°1 compris.
- Le serveur refuse un score plus long que le temps qu'il a mesuré entre le départ et l'envoi, avec 15 s de marge (`SLACK_MS`). Avant le 31/10/2026, 5 s : un départ lent sur un réseau saturé pouvait faire refuser un score honnête. Contrepartie : un tricheur peut gagner jusqu'à 15 s.
- Téléphone verrouillé ou appli quittée en pleine partie : la partie se met en pause, « Touche pour reprendre » (un simple clic suffit aussi sur ordinateur, même très bref). Le temps de pause compte dans le temps réel vu par le serveur, tout comme un envoi en retard : l'admin affiche alors « partie ralentie, mise en pause ou envoyée en retard ».
- Le cache hors ligne (`sw.js`) est renouvelé à chaque version. Si le jeu plante au démarrage (par exemple des fichiers de deux versions mélangés par un réseau instable juste après une mise en ligne), `boot.js` recharge la page une fois, au plus toutes les 15 s.
- Écran de chargement (31/10/2026) : la tartine de l'icône flotte, ses réacteurs crépitent, une barre avance à chaque fichier reçu (`boot.js`, sans jamais dire fini) puis se remplit quand le jeu est prêt, la police chargée et le classement reçu (ou au bout de 2,5 s, pour jouer hors ligne), et l'écran s'efface (`loader.js`). Sécurité : il disparaît au bout de 10 s quoi qu'il arrive. Juste avant, sur l'appli installée, le téléphone montre lui-même l'icône sur fond nuit : ça, on ne peut pas l'animer.
- Petits téléphones (30/10/2026, des joueurs avaient des lags) : le jeu mesure sa fluidité. Si l'image médiane dépasse 20 ms (moins de 50 images par seconde ; 24 ms avant le 30/10/2026 au soir), il baisse sa netteté par paliers (`QUALITY` dans `scene.js` : densité 2, 1,5, 1,25 puis 1) et s'en souvient sur ce téléphone (`cv-qualite`). Densité 2 au plus pour tout le monde (avant : 2,5). La couche des annonces n'est plus effacée quand elle est déjà vide. Tartine en image : gain faible, pas fait.
- Planètes en image (31/10/2026, il restait des joueurs avec des lags) : chaque planète du fond est dessinée dans une image à part (`art` dans `scene.js`), puis seulement collée à chaque image du jeu. Les planètes fixes ne sont dessinées qu'une fois, les animées sont redessinées 30 fois par seconde (20 puis 15 fois quand le téléphone a baissé sa netteté, `REDRAW_S`). `reach` dans `BODIES` donne la taille de l'image (anneaux, ondes, Tung et sa batte compris). Mesuré sur un PC, par image : violette 3,4 ms, citrouille 3,8, lune de Méliès 3,6, grille-pain 2,2, crêpe et enceintes environ 1 ms en direct, contre 0,1 à 0,2 ms une fois en image. Fond du jeu opaque (`alpha: false`), plus léger à afficher. Mettre les couverts en image est plus lent. Réécrire des bouts en Rust (WebAssembly) n'aiderait pas : le dessin se fait dans le navigateur, et le reste du calcul est devenu négligeable.

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
- Outils locaux (`LOCAL` dans `shared/local.js` : localhost, 127.0.0.1 ou une adresse du réseau privé comme 192.168.x.x, donc aussi un téléphone sur le wifi ; jamais l'adresse en ligne) : `?accessoires=tous`, `?succes=tous`, `?garnitures=toutes`, `?planetes=souvent`, `?etoiles=souvent` (voir plus haut), `?jeton=<jeton>` qui connecte le téléphone à ce joueur (lien donné par `npm run seed`), et le mode invincible : carte « Mode test » de Paramètres (Non / Oui, gardé le temps de l'onglet, `cv-invincible` en sessionStorage). Allumé, les couverts ne tuent plus (option `immortal` de `createSim`), et une pastille « Invincible ✕ » sous le chrono rappelle qu'il est actif : la toucher l'enlève en pleine partie, pour mourir au prochain coup. Une partie invincible compte comme une autre (record, classement local, succès), pour pouvoir tester les longues parties.

| Dossier | Rôle |
|---|---|
| `public/js/game/` | Le jeu sans affichage (terrain, armes, attaques, solveur, boucle), partagé avec les tests |
| `public/js/app/` | Le jeu dans le navigateur : `main.js` (états et boucle), dessin, son, écrans, succès, appels au serveur |
| `public/js/admin/`, `public/js/ecran/` | Tableau de bord admin, écran géant |
| `public/js/shared/` | Stockage du téléphone, formats, couleurs (`palette.js`) |
| `public/sw.js`, `manifest.webmanifest` | Appli installable |
| `src/` | API : routes (`routes/`, liste dans `worker.ts`), base et cache (`db.ts`), sécurité et contrôles |
| `migrations/` | Schéma de la base |
| `scripts/` | Mise en ligne, icônes, QR codes, seed de la base locale |
| `test/` | Robot d'équité, tests de l'API, outils d'équilibrage (`equilibrage/`) |
| `maquettes/` | Images de travail : pistes de redesign de la tartine (pas retenues), planches des garnitures, des accessoires, des canettes, des planètes drôles, du ciel (toutes les planètes, la Tesla et la soucoupe), des couleurs de la deuxième planète enceintes, de Tung Tung Tung Sahur et des mains Six Seven |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire après une migration) |
| `npm run seed` | Remplir la base locale pour tester (jamais en ligne : refuse `--remote`). Efface puis recrée ses propres données, sans toucher aux tiennes : 24 joueurs (`seed-*`) avec parties, records Mobile et PC, tenues, et 3 soirées passées (« Space Tartinade test 1 à 3 », id 9001 à 9003). Dont « Testeur » (record 95,12 s, 1er de la soirée test 2, une partie à 1,80 s, une à 67,42 s, une à 40,00 s, sans tenue envoyée) et « Tricheur » (retiré, 14 min, pas de fiche). Affiche un lien `?jeton=` pour jouer en Testeur. `npm run seed -- --soiree` ajoute une soirée en cours (maintenant moins 1 h jusqu'à plus 3 h) |
| `npm run dev` | Jeu en local sur http://localhost:8787, clé admin dans `.dev.vars`. Dans l'app Claude, le serveur « croute-que-croute » de `.claude/launch.json` lance la même chose, ouvert au wifi (`--ip 0.0.0.0`) pour tester sur téléphone |
| `npm test` | Robot d'équité, 0 mort attendu (environ 4 min) |
| `npm run test:api` | Tests de l'API, avec `npm run dev` lancé (refusent toute autre adresse que la machine locale) |
| `npm run equilibrage` et suivantes | Mesurer le dosage du jeu avec le robot « humain » (voir Équilibrage) |
| `npm run check` | Vérifier les types de l'API |
| `npm run db:remote` | Appliquer les migrations en ligne, avant `npm run deploy` |
| `npm run deploy` | Mettre en ligne. Refuse si git n'est pas à jour, si une migration manque en ligne ou si une soirée est ouverte (`npm run deploy -- --pendant-soiree` en urgence) |
| `npm run icons`, `npm run qr` | Regénérer les icônes et les QR codes |

## Ajouter du contenu

- Attaque : une fonction dans `attacks.js` et une ligne dans `ATTACKS` (dès quand, poids, durée ; `solo: true` pour une grosse figure, `calm: true` pour qu'elle attende la fin des annonces en cours puis joue seule, `growsUntil` et `growth` si elle grossit avec le temps). `notice` sur une annonce ne l'affiche que peu avant son arrivée. Le solveur la vérifie tout seul.
- Arme : sa taille dans `projectiles.js` et son dessin dans `sprites.js`, sous le même nom.
- Prototype : `lab: true` dans `ATTACKS` ou `PROJECTILES`. Visible dans Infos pour les admins seulement, jamais tiré en jeu.
- Tartinade rare : une ligne dans `SPREADS` (`palette.js`, avec `with` pour « par un couteau au… ») et son nom dans `RARE_SPREADS` (`projectiles.js`). Elle devient aussi une garniture à débloquer.
- Événement de partie : `sim.js` le renvoie dans les événements de `step`, `main.js` y réagit dans `ON_SIM`.
- Succès : une ligne dans `ACHIEVEMENTS` et sa condition dans `runTick`, `runEnd`, `afterSubmit` ou `onBoard`.
- Après un ajout qui touche aux attaques, refaire un point d'équilibrage (voir Équilibrage).
- Route d'API : une fonction dans `src/routes/` et une ligne dans `src/worker.ts`, avec son niveau d'accès.

## À faire

- Adresse : garder « workers.dev » ou prendre un nom de domaine payant (le QR code changerait). Décision à l'AG du lundi 02/11/2026 à 20h, avant d'imprimer les affiches.
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Faire monter le morceau par un ami DJ : coupes et transitions propres, fin qui boucle. Les coupes faites dans le code en attendant sont approximatives.
- Compte sur plusieurs appareils (piste du 31/10/2026) : un joueur qui change d'appareil, ou qui vide son navigateur, ne peut pas reprendre son pseudo. Faits le 31/10/2026 : lot 1, une clé par appareil (`sessions`) et progression gardée sur le serveur ; lot 2, QR et code de liaison ; lot 3, fusion de deux comptes ; « Déconnecter les autres » (voir Appli et réseau). Reste, pour récupérer son compte sans autre appareil : un code de secours ou un code reçu par e-mail. L'e-mail passerait par le compte Resend de Movie Picker (gratuit : 3 domaines, 100 e-mails par jour et 3 000 par mois partagés entre les projets), avec un domaine à soi pour l'expéditeur, à voir avec la décision sur l'adresse du jeu.
- Peaufiner la difficulté des attaques qui s'enchaînent (demande d'Adrien, 31/10/2026). Certains enchaînements sont trop faciles, d'autres trop durs, donc le score dépend encore trop de la chance. À faire : repérer les deux cas (mesurer les morts et les esquives sans effort par paire d'attaques qui se suivent, avec le robot « humain » de l'équilibrage), puis ajouter des règles d'enchaînement pour les équilibrer, comme celles qui existent déjà (pas de mur juste après des murs en série, pas de mur pendant un rouleau, voir Attaques).

### Après le compte multi-appareils

Demandé par Adrien le 31/10/2026, à commencer seulement une fois les lots du compte multi-appareils finis.

- Revoir le design du tableau de bord admin.
- Pages Infos, reste de la critique du 31/10/2026 : boutons des Crédits pleine largeur ; une seule sortie (croix ou « Retour ») pour tous les écrans de ce type ; aperçus des attaques figés quand le téléphone demande moins d'animations.

## Idées pour plus tard

- Vibration au frôlé.
- Dernier quart d'heure : 15 min avant la fermeture, l'accueil et l'écran géant passent en rouge, compte à rebours en grand.
- Compteur de la salle sur l'écran géant : temps cumulé de toutes les parties de la soirée. Une ligne écrite en plus par partie.
- Nouvelles attaques vers 65 s, pour que les meilleurs découvrent encore quelque chose (la dernière arrive à 54 s) : cuillère boomerang qui traverse puis revient, pince de deux couteaux qui se referment, spirale de fourchettes.
- Même partie pour tous : une seule suite d'attaques par soirée, identique pour tout le monde. La plus tryhard, mais elle change l'esprit du classement.
- Une phase après 60 s (« mode sérieux »), ou des moments calmes et des pics calés sur les drops du morceau.
- Suites d'attaques calées sur la musique, ou tirées parmi des enchaînements déjà écrits qui reviennent : analyser d'abord le morceau pour caler au moins les montées et les drops.
- Partage du score en story Insta.
- Montrer les fonctionnalités petit à petit, pour ne pas surcharger les premières parties. Les flèches de la tartine, elles, sont visibles dès le départ depuis l'ajout de la tartine nature (31/10/2026). À étendre au reste (succès, classement de soirée, infos).
- À brainstormer : un score de complétion quelque part, qui dit à quel point on a fait le jeu à 100 % ou non.
- Connexion avec Google, en plus du compte multi-appareils : gratuit (projet Google Cloud à créer), mais demande une page de confidentialité (l'e-mail du joueur est une donnée perso) et d'autoriser le script de Google dans la politique de sécurité du site.
- Planètes mises de côté le 31/10/2026 : planète qui dort (bonnet de nuit de la tartine, bulle au nez, « Z ») et tartine astronaute qui dérive en faisant coucou. Leur code est dans le commit 0e9166b. Boule de Noël accrochée à un fil qui ne mène nulle part, sous les flocons : son code est dans le commit 35a699d. Le mur de son et l'île au trésor ont été retirés, leur rendu n'était pas assez bon.
- Pas retenues pour l'instant : thème de soirée choisi par l'admin, tartine du designer ou redessinée (Adrien garde la tartine actuelle, pistes dans `maquettes/`), étoiles au rythme de la musique, son d'annonce par attaque, couche de tension, podium de fin de soirée sur l'écran géant.

## Bon à savoir

- Hors git, à garder de côté : `cle-admin.txt`, `.dev.vars`, `invitation-*.txt`, `sauvegardes/`, la musique, `ecoute-sons/` (écoute des bruitages candidats : `node ecoute-sons/serve.mjs`).
- Sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`. Celles d'avant le 29/10/2026 contiennent des jetons en clair : à garder pour soi.
- Retour en arrière sans sauvegarde, à n'importe quel moment des 7 derniers jours (Time Travel, gratuit) : `npx wrangler d1 time-travel restore croute-que-croute --timestamp=<heure unix>`. Ça écrase la base en ligne : sauvegarder d'abord.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami`).
- Base vidée le 29/10/2026 au changement d'adresse : chaque téléphone est reparti de zéro.
