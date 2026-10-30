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
- Le rythme des attaques plafonne à 60 s, la vitesse des couverts à 75 s, puis plus rien ne change. Le plafond est volontairement bas : au-delà, c'est l'endurance qui départage (voir Équilibrage).
- Zones de touche : la tartine est un cercle de 26 px, chaque arme est faite de gélules (`parts` dans `projectiles.js`). « Frôlé » quand la tartine passe à moins de 11 px.
- Frôlés : « Frôlé x2 », « x3 »… quand ils s'enchaînent à moins de 1,5 s, avec un son plus aigu à chaque cran (6 au plus). Chaque frôlé laisse une entaille dans la croûte, du côté où le couvert est passé (12 au plus). Aucun effet sur le score ni sur la zone de touche.
- Effets : le chrono flashe en jaune toutes les 10 s, les couverts rapides (dès 380 px/s) laissent une traînée, et le fond passe du bleu nuit au violet vers 40 s puis au rouge sombre à 75 s, au rythme de la vitesse des couverts (`HEAT` dans `palette.js`).
- Planètes du fond (`BODIES` dans `planets.js`, couleurs dans `SKY` de `palette.js`) : planète violette à anneau, lunes, planète pancake et son pot de confiture, planète verte à anneau, planète enceintes, astéroïde. Elles défilent en boucle.
- Planètes rares (`RARE` dans `planets.js`) : Tung Tung Tung Sahur qui danse avec sa batte sur l'astéroïde (trois coups, puis une pause), lune en fromage (jaune beurre, trous creusés et entailles sur le bord) dont une souris grignote le bord, grille-pain rond en chrome (reflets, fentes rougeoyantes, molette, levier) dont les deux tartines (la silhouette de celle du jeu) sautent toutes les 6 s. Un tour sur trois (`PASSES` dans `scene.js`), l'astéroïde laisse sa place à une seule d'entre elles, tirée au hasard, jamais la même deux fois de suite. En local, `?planetes=souvent` démarre juste avant.
- Étoile filante : de temps en temps (première entre 30 s et 3 min après l'ouverture du jeu, puis toutes les 2 à 4 min, menu compris), une petite canette traverse le fond en 9 s, loin derrière les planètes et les étoiles, avec une traînée dorée, en tournant doucement : 8.6 Original (bleu nuit, loup bleu, gros 8.6 blanc au point rouge) ou Amsterdam Maximator (vert, armoiries, voilier blanc à coque dorée), redessinées d'après les photos produit. Attention, certaines photos de magasin sont délavées : vérifier les couleurs sur l'image seule. Dessinée comme les planètes (sans contour, opaque, seule la traînée est transparente) pour qu'on ne la prenne pas pour une arme. Canettes dans `planets.js` (`CANS`), passage dans `scene.js` (`COMET_*`). En local, `?etoiles=souvent` la fait passer toutes les 4 à 6 s (pour tester seulement : sans ce lien, le vrai rythme).
- Mort : le jeu se fige 0,3 s, puis l'éclaboussure. Sous « Tartinée ! », l'arme qui t'a eu (« par un hachoir », « par un couteau au dentifrice ») : `by` dans `PROJECTILES`, `with` dans `SPREADS`.
- Garnitures : 9 tartinades dessinées sur la tartine (`TOPPINGS` dans `sprites.js`) : confiture, pâte à tartiner, miel et son abeille, ketchup en zigzag, dentifrice rayé, œuf au plat, sardine entière, slime qui a un œil, pâtée pour chien tartinée avec son odeur et sa mouche. Beurre au départ. 1 attaque à couteaux sur 10 a un couteau garni : le frôler ou se faire tuer par lui débloque sa garniture (pas en entraînement). Une garniture gagnée est mise tout de suite. Dès la première, toucher la tartine de l'accueil ouvre des flèches pour changer (une astuce le dit tant qu'on ne l'a pas fait). Gardées sur le téléphone (`cv-garnitures`, `cv-garniture`, `cv-garniture-astuce`), purement visuel. En local, `?garnitures=toutes` dans l'adresse les débloque toutes.
- Accessoires : 4 dessinés (`HATS` et `sideBoosters` dans `sprites.js`, noms dans `GEAR` de `palette.js`) : boosters sur les côtés comme l'affiche, chapeau de sorcière, bonnet de Noël, chapeau de pirate. Chacun est la récompense d'un succès (champ `gear`) : Dix tartines → bonnet, Croustillante → sorcière, Une minute de gloire → boosters, Dans le top → pirate. Un accessoire gagné est mis tout de suite, même en pleine partie. Choix dans les flèches de la tartine de l'accueil (2e ligne, « Sans accessoire » possible). Gardé sur le téléphone (`cv-accessoire`), purement visuel. En local, `?accessoires=tous` les débloque tous le temps de la page.
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
| Murs en série | 28 s | 2 murs d'affilée du même côté ou du haut (3 dès 60 s), trous d'environ 120 px, décalés de 140 px au plus d'un mur à l'autre. Chaque mur n'est annoncé que juste avant d'arriver. Joue seul : l'attaque suivante part quand le dernier mur a fait 20 % de sa traversée |
| Croix | 32 s | 4 couteaux en même temps vers la tartine |
| Couteau à pain | 38 s | Rebondit une fois sur un bord |
| Pluie en biais | 45 s | 7 à 8 fourchettes en diagonale, qui balaient l'écran d'un côté à l'autre |
| Double pluie | 54 s | 8 fourchettes (9 dès 60 s), à gauche et à droite en alternance |

- Vitesse des couverts : × (1,4 + t / 75), plafond × 2,4 à 75 s (`SPEED_START`, `SPEED_RAMP`, `SPEED_MAX` dans `field.js`). Délai entre deux attaques : 0,95 s moins 0,0067 × t, 0,55 s au plus court dès 60 s (`GAP_*` dans `sim.js`). Courbe du 30/10/2026, choisie avec le robot « humain » (voir Équilibrage), puis plafond de vitesse monté de 2,2 à 2,4 par Adrien après l'avoir testée : trop facile après 60 s. Avant : × 1 à × 2,6 à 80 s, et 1,25 s à 0,42 s dès 52 s. Début trop calme, mur de difficulté entre 40 et 60 s, puis un plafond si haut que la chance décidait.
- Jamais plus de 3 fois la même attaque d'affilée, sauf si c'est la seule possible (couteau visé avant 3 s). Croix, murs en série et double pluie ne sortent jamais deux fois de suite. Jamais de mur juste après des murs en série, ni l'inverse (même `kin`). Pas de mur ni de murs en série tant qu'un rouleau est annoncé ou à l'écran, et l'inverse (`shuns`) : un rouleau dans le trou d'un mur le bouchait presque. Si les murs en série sont tirés pendant une annonce, ils attendent qu'elle soit partie (rien d'autre n'est annoncé entre-temps), et l'attaque suivante ne part que quand leur dernier mur a fait 20 % de sa traversée (`CALM_PASS` dans `sim.js`), avec une « durée » (`cost`) de 1. Il reste environ 1 s sans nouvel objet après le dernier mur entre 28 et 60 s, puis 0,86 s, à peine plus que l'écart normal (0,8 à 0,9 s). Historique du 30/10/2026, Adrien trouvant l'attente trop longue à chaque fois : d'abord jusqu'à ce que le dernier mur quitte l'écran (environ 2 s de vide), puis 40 % de sa traversée avec une durée de 4 (1,2 à 1,8 s, la durée de 4 imposait elle-même l'attente avant 60 s). Avant aussi, les murs en série étaient écartés à chaque annonce en cours, et après 60 s ils ne sortaient presque plus.
- 1 attaque à couteaux sur 10 a un couteau garni (voir Garnitures).
- Fouet mis de côté (jugé trop facile) : `lab: true` dans `attacks.js` et `projectiles.js`, visible seulement dans l'admin. Enlever `lab` pour le remettre.
- Couloir (deux murs de deux côtés, 46 s) mis de côté de la même façon : trop proche des murs en série, on pouvait le prendre pour un bug.
- Chances, vitesses et délais de chaque attaque : `attacks.js`. Le calendrier est dans le jeu (Infos, onglet Attaques).
- Le trou des murs en série par le haut pouvait sauter d'un bord à l'autre entre deux murs : 27 morts pour 100 séries chez un débutant, contre 5 par les côtés. Limité à 140 px depuis le 30/10/2026, comme par les côtés.

## Équité

- Avant chaque attaque, le solveur simule les 3,5 s suivantes (jusqu'à 4,5 s si l'attaque dure plus longtemps, comme les murs en série) avec tout ce qui est en vol. S'il ne trouve pas de chemin pour la tartine, en comptant 0,1 s de réaction, l'attaque est remplacée (5 essais au plus).
- Le modèle est prudent (grille de 12 px, doigt à 360 px/s au plus, marge de 11 px autour des couverts) : si le robot passe, un humain peut passer.
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
- À surveiller : les murs en série par le haut restent le piège n°1 des débutants. Avec 0,7 s de préavis, un débutant ne parcourt qu'environ 100 px, alors que le trou peut se décaler de 140 px.

## Soirées et classements

- Pas de compte : le téléphone garde un jeton et son profil pour toujours. Le même téléphone qui retape son pseudo retrouve son compte.
- Pseudo unique sur tout le jeu, de 2 à 16 caractères : lettres latines (accents, œ, æ, ß et ø permis), chiffres, espaces, tirets. Majuscules et accents ne comptent pas pour l'unicité. Il se change dans Paramètres, record et place suivent.
- Deux classements : celui de la soirée (pour le lot) et le général, permanent. À égalité, le premier à avoir fait le temps passe devant.
- Écran Classement : les 10 premiers, podium or, argent et bronze, puis ta place exacte si tu n'es pas dedans. Jamais de défilement : sur un petit écran, on enlève des lignes par le bas (3 au moins).
- Quand une soirée est annoncée mais pas commencée, l'écran Classement montre les onglets Soirée et Général et s'ouvre sur Général. L'onglet Soirée donne son nom et « Prochaine soirée lundi 02/11 à 20h00 » (plus sur l'accueil).
- Une seule soirée à la fois, créée à l'avance dans l'admin pour être annoncée dans le jeu.
- Les parties commencées avant la fin comptent encore 5 min après. Le gagnant n'est annoncé (« Bravo X ! », succès Tartine d'or) qu'après ces 5 min.
- Les téléphones relisent le classement toutes les 10 s (30 s sur l'accueil), et plus du tout écran éteint. Le serveur le garde 10 s en mémoire, le général 60 s pendant une soirée : jusqu'à 20 s de retard (70 s pour le général). Ta place après une partie est à jour tout de suite.
- En base : `profiles` (joueurs et record général), `entries` (record par soirée), `runs` (parties), `events` (soirées).

## Triche et sécurité

- Le serveur refuse un score plus long que le temps réellement écoulé (5 s de marge) ou au-delà de 15 min. Un score renvoyé deux fois ne compte qu'une fois.
- Signalés dans l'admin : record de 90 s ou plus, et partie ralentie ou mise en pause (plus de 15 % et 15 s de temps réel en trop).
- Faille connue : un faux score plausible (vers 60 s) passe inaperçu. Parade possible : rejouer la partie à partir des gestes (voir « À faire »).
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
- Elle ne joue qu'en partie et repart du début à chaque partie, pour suivre la montée de la difficulté.
- Coupée et en boucle : elle joue jusqu'à 83,1 s (la voix finit de retomber), saute à la montée de 131,9 s qui mène au second passage énergique, puis reboucle sur la montée après 208,7 s. Coupes calées sur le tempo (172 BPM) et les débuts de mesure, déclenchées par la position réelle de la musique (`MUSIC_PARTS` dans `audio.js`). Approximatives en attendant une version montée par un DJ.
- À la mort, elle passe « sous l'eau » puis s'éteint (2,5 s). Elle passe pour ça par Web Audio sur tous les téléphones.
- Changer de musique : remplacer le fichier, mettre à jour `MUSIC_CREDIT` et `MUSIC_PARTS` (`[[0, durée]]` pour tout jouer en boucle) dans `audio.js`, puis `npm run deploy`.
- Bruitages Mixkit dans `public/sfx/` (départ, frôlé, mort, record, 1re place). Licence gratuite d'après la FAQ Mixkit, texte officiel à relire avant une diffusion hors soirée. Changer : remplacer le fichier, ou une ligne dans `SOUNDS` (`audio.js`).
- Volumes Musique et Bruitages dans Paramètres. Sur iPhone, le bouton silencieux coupe les bruitages, pas la musique (règle d'Apple).
- Pas de son sur les annonces d'attaque : ça avantagerait ceux qui jouent avec le son.

## Succès

- 22 succès en 5 familles (temps de cuisson, frôlés et découvertes, garnitures, assiduité et soirées, secrets) : liste et conditions dans `achievements.js`.
- Un secret pas encore trouvé montre « ??? » et un indice (`hint`).
- Badge « Nouveau » sur les succès gagnés depuis la dernière visite de l'écran (`seen` dans `cv-succes`).
- Un succès qui donne un accessoire l'écrit sous sa condition (« Débloque : … »).
- Garnitures : 1, 4 puis toutes gagnées. Le secret « Ouaf » : se faire tartiner par un couteau à la pâtée pour chien.
- Gardés sur le téléphone (`cv-succes`), sans effet sur le classement. Perdus en changeant de téléphone ou de navigateur. Sur iPhone, Safari et l'appli installée ne partagent pas leurs succès.
- Le nombre de parties prend le plus grand entre le compteur du téléphone et celui du serveur.

## Appli et réseau

- Installable : bouton Installer sur Android, Partager puis « Sur l'écran d'accueil » sur iPhone. Le jeu s'ouvre sans réseau s'il a déjà été ouvert une fois.
- Chaque `npm run deploy` crée une version. Le jeu se recharge seul quand elle change, jamais en pleine partie. Le serveur refuse l'inscription et le début de partie d'une ancienne version.
- Une partie ne compte que si le réseau passe au départ. À la fin, l'envoi du score réessaie pendant 2 min (« Envoi en attente… »), même si on ferme le jeu ou si le serveur a une erreur passagère.
- Téléphone verrouillé ou appli quittée en pleine partie : la partie se met en pause, « Touche pour reprendre » (un simple clic suffit aussi sur ordinateur, même très bref). Le temps de pause compte dans le temps réel vu par le serveur : l'admin affiche alors « partie ralentie ou mise en pause ».
- Le cache hors ligne (`sw.js`) est renouvelé à chaque version.

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
| `test/` | Robot d'équité, tests de l'API, outils d'équilibrage (`equilibrage/`) |
| `maquettes/` | Images de travail : pistes de redesign de la tartine (pas retenues), planches des garnitures, des accessoires, des canettes, des planètes drôles et de Tung Tung Tung Sahur |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire après une migration) |
| `npm run dev` | Jeu en local sur http://localhost:8787, clé admin dans `.dev.vars` |
| `npm test` | Robot d'équité, 0 mort attendu (environ 4 min) |
| `npm run test:api` | Tests de l'API, avec `npm run dev` lancé |
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
- Reprendre les couleurs des affiches : fichiers du designer dans `affiches/`. Les affiches sont aplaties : demander les éléments séparés.
- Compléter Infos avec toutes les dernières nouveautés, pour en faire un wiki du jeu où tout se trouve : comment débloquer les garnitures et les accessoires, les succès, les planètes et canettes rares, les classements et les soirées, etc.
- Changement d'appareil : le profil est lié au téléphone (identifiant gardé dans le navigateur). Un joueur qui change d'appareil, ou qui vide son navigateur, ne peut pas reprendre son pseudo et doit recréer un compte. À explorer : un vrai compte (e-mail ou mot de passe), ou plus léger, un code de transfert affiché dans les paramètres, à taper ou scanner sur le nouvel appareil.
- À décider : rejouer les meilleures parties pour confirmer leur temps (graine donnée par le serveur, gestes enregistrés). Bloquerait la triche par faux score.

## Idées pour plus tard

- Vibration au frôlé, succès gardés sur le serveur.
- Dernier quart d'heure : 15 min avant la fermeture, l'accueil et l'écran géant passent en rouge, compte à rebours en grand.
- Compteur de la salle sur l'écran géant : temps cumulé de toutes les parties de la soirée. Une ligne écrite en plus par partie.
- Nouvelles attaques vers 65 s, pour que les meilleurs découvrent encore quelque chose (la dernière arrive à 54 s) : cuillère boomerang qui traverse puis revient, pince de deux couteaux qui se referment, spirale de fourchettes.
- Même partie pour tous : une seule suite d'attaques par soirée, identique pour tout le monde. La plus tryhard, mais elle change l'esprit du classement.
- Une phase après 60 s (« mode sérieux »), ou des moments calmes et des pics calés sur les drops du morceau.
- Suites d'attaques calées sur la musique, ou tirées parmi des enchaînements déjà écrits qui reviennent : analyser d'abord le morceau pour caler au moins les montées et les drops.
- Partage du score en story Insta.
- Montrer les fonctionnalités petit à petit, pour ne pas surcharger les premières parties. Déjà fait pour les garnitures (flèches cachées tant qu'aucune n'est gagnée), à étendre au reste (succès, classement de soirée, infos).
- À brainstormer : d'autres accessoires, comme des skins sur la tartine (couronne, lunettes, casque d'astronaute…), à débloquer aussi avec des succès. Séparer les chapeaux des accessoires sur les côtés (comme les boosters), pour pouvoir porter un de chaque.
- À brainstormer : toucher un pseudo dans le classement pour voir la fiche profil du joueur.
- À brainstormer : un score de complétion quelque part, qui dit à quel point on a fait le jeu à 100 % ou non.
- Pas retenues pour l'instant : thème de soirée choisi par l'admin, tartine du designer ou redessinée (Adrien garde la tartine actuelle, pistes dans `maquettes/`), étoiles au rythme de la musique, son d'annonce par attaque, couche de tension, podium de fin de soirée sur l'écran géant.

## Bon à savoir

- Hors git, à garder de côté : `cle-admin.txt`, `.dev.vars`, `invitation-*.txt`, `sauvegardes/`, la musique, `ecoute-sons/` (écoute des bruitages candidats : `node ecoute-sons/serve.mjs`).
- Sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`. Celles d'avant le 29/10/2026 contiennent des jetons en clair : à garder pour soi.
- Retour en arrière sans sauvegarde, à n'importe quel moment des 7 derniers jours (Time Travel, gratuit) : `npx wrangler d1 time-travel restore croute-que-croute --timestamp=<heure unix>`. Ça écrase la base en ligne : sauvegarder d'abord.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami`).
- Base vidée le 29/10/2026 au changement d'adresse : chaque téléphone est reparti de zéro.
