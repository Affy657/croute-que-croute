# Croûte que Croûte

Jeu de soirée du collectif Tartine Sauvage. La tartine-fusée esquive les couverts, et le meilleur temps de la soirée gagne une conso (bière ou soft).

## Liens

- Jeu : https://croute-que-croute.tartine-sauvage.workers.dev
- Admin : https://croute-que-croute.tartine-sauvage.workers.dev/admin, dans la même appli que le jeu
- Écran géant : https://croute-que-croute.tartine-sauvage.workers.dev/ecran, à ouvrir sur l'ordinateur branché à l'écran ou au vidéoprojecteur
- QR code aux couleurs du jeu (choisi par Adrien le 29/10/2026 parmi 3 essais) : `qr/croute-que-croute.png` pour imprimer, `qr/croute-que-croute.svg` pour une affiche. Le même est dans le jeu (`public/qr.svg`, Paramètres puis « QR code »).
  - Style : fond crème, points ronds bleu nuit, coins arrondis avec un centre confiture, icône du jeu au centre. Correction d'erreur maximale (H) pour que la tartine au centre ne gêne pas.
  - Les lignes de repère et le petit carré de repère en bas à droite restent pleins : avec des points ronds partout, un lecteur de test (jsQR) ratait le code en grand format.
  - Testé au décodage en grand (1000 px), en petit (110 px), flou et sombre : aussi fiable que le QR simple. À scanner quand même sur plusieurs téléphones avant d'imprimer.
  - Version simple en secours : `qr/croute-que-croute-simple.png` et `.svg` (carrés noirs sur blanc).
- Adresse changée le 29/10/2026 (avant : croute-que-croute.croute-que-croute.workers.dev, qui ne répond plus). Régénérer tous les QR codes (stylé, simple et celui du jeu) : `npm run qr`, ou `npm run qr -- <adresse>` pour une autre adresse (script `scripts/qr.mjs`).
- Code : `C:\dev\couverts-volants`, git local sur `master`, pas encore de dépôt GitHub
- POC d'origine (artefact Claude, plus mis à jour) : https://claude.ai/artifact/V2KMTGkcktubs8VguX8AxE

## Le jeu en bref

- On scanne le QR code, on choisit un pseudo, on joue autant qu'on veut.
- Le doigt glisse n'importe où et la tartine suit le mouvement, 1,8 fois plus loin que le doigt. Elle ne se place pas sous le doigt, donc le doigt ne la cache pas.
- Sous le doigt, un rond avec quatre petites flèches montre que c'est le doigt qui pilote, comme un joystick. Une onde jaune part du doigt quand on le pose.
- Si on lève le doigt en pleine partie, un rond qui glisse de gauche à droite et « Pose ton doigt où tu veux » apparaissent en bas de l'écran. Rien de tout ça à la souris sur ordinateur.
- Commandes testées par Adrien le 29/10/2026 : un vrai joystick (on incline, la tartine avance tant qu'on tient) était plus dur et pas agréable ; un pavé dans une zone en bas, avec le glissement plus rapide, était mieux que l'ancien glissement (1,15) mais la zone gênait. Gardé : le glissement du pavé, partout sur l'écran, avec le rond sous le doigt.
- Rien n'arrive par le bas, car le doigt cacherait les attaques.
- Les attaques par les côtés partent seulement des 60 % du haut.
- Chaque attaque est annoncée 0,45 à 0,9 s avant par une pastille au bord de l'écran (depuis le 28/10/2026, à la place d'une petite flèche orange peu visible) :
  - un rond sombre avec la silhouette de l'arme qui arrive (couteau, fourchette, hachoir, rouleau, fouet, couteau à pain) ; l'éventail montre trois couteaux en cône, et un couteau qui tourne tourne aussi dans sa pastille ;
  - une pointe orange vers où part l'arme ;
  - un cercle orange qui se remplit jusqu'au lancer.
- Les pastilles sont dessinées sur un calque au-dessus du score : le chrono ne les cache jamais.

## Les attaques

### Couteau visé (dès 0 s)

- 1 couteau, lancé du haut ou d'un côté vers l'endroit où est la tartine au moment de l'annonce.
- Annonce 0,5 s avant : bouger pendant l'annonce suffit pour l'esquiver.
- Dès 35 s, 1 fois sur 3, le couteau tourne sur lui-même et occupe plus de place.

```
  (>)          pastille d'annonce au bord
   \
    \          le couteau file en ligne droite
     \
     [T]       la tartine au moment de l'annonce
```

### Pluie de fourchettes (dès 6 s)

- 4 fourchettes, plus 1 toutes les 15 s (8 au maximum).
- Elles tombent du haut l'une après l'autre (une toutes les 0,14 s), un peu en biais.

```
  v     v  v      v    v      pastilles en haut
  |     |  |      |    |
  |     |  |      |    |      chute presque droite
```

### Hachoir (dès 10 s)

- Un hachoir tombe tout droit au-dessus de la tartine, très vite (300 px/s au départ).
- Annonce 0,9 s avant, plus longue que les autres : il suffit de quitter sa colonne.

```
     v        pastille au-dessus de la tartine
     #
     #        chute verticale
    [T]
```

### Mur (dès 14 s)

- Une rangée de couverts serrés avec un seul trou d'environ 100 px.
- Par le côté : un couteau tous les 34 px, trou toujours dans les 62 % du haut.
- Par le haut : une fourchette tous les 36 px.
- Annonce 0,7 s avant : les pastilles montrent déjà où est le trou.

```
Par le côté            Par le haut

>=====                 v v v v         v v v
>=====                 | | | |   trou  | | |
        <- trou        | | | |         | | |
>=====
>=====
```

### Rouleau à pâtisserie (dès 18 s)

- Un gros rouleau debout (84 px de haut) traverse lentement l'écran par un côté, dans les 60 % du haut.
- Annonce 0,7 s avant. Passer au-dessus ou en dessous.

```
>  ||
   ||  ->     le rouleau glisse vers l'autre côté
   ||
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

### Fouet (dès 28 s)

- Un fouet qui tourne sur lui-même descend lentement (100 px/s au départ) vers la tartine. Sa zone tournante est grosse.
- Annonce 0,7 s avant. S'écarter de sa ligne tôt.

### Croix (dès 32 s)

- 4 couteaux en même temps : un de chaque coin du haut et un de chaque côté (dans les 60 % du haut), tous vers la tartine.
- Annonce 0,7 s avant. Il faut s'écarter du point visé, par exemple vers le bas.

```
  >           <
    \       /
  >--- [T] ---<
```

### Couteau à pain (dès 38 s)

- Lancé d'un coin du haut vers le bord opposé, il rebondit une fois puis file vers la tartine.
- Annonce 0,6 s avant. Le solveur connaît le rebond.

```
  >
    \
      \      |
        \    |  rebond
          \  |
     [T] <---
```

### Couloir (dès 46 s)

- Un mur par un côté, puis un mur par l'autre côté 0,7 s plus tard, chacun avec son trou (120 px, plus grand que pour un mur seul).
- Il faut passer le premier trou puis rejoindre le second.

```
>=====          =====<
         trou 1  =====<
>=====          <- trou 2
>=====          =====<
```

### Double pluie (dès 54 s)

- 5 à 9 fourchettes qui tombent tout droit, une toutes les 0,13 s, en alternant moitié gauche et moitié droite.
- Revue le 28/10/2026 : la première version (8 à 16 fourchettes en biais) était trop dure à lire.

### Variantes rares

- Environ 1 attaque sur 40 : un seul de ses couteaux porte autre chose que du beurre (confiture, pâte à tartiner, miel ou ketchup).
- Pur visuel : même taille, même zone de touche, aucun effet sur le score ni sur l'équité.

## Zones de touche

- Tartine : un cercle de 26 px de diamètre au centre (`HIT_R` dans `field.js`).
- Chaque arme est faite d'une ou plusieurs gélules (`parts` dans `projectiles.js` : un segment et un rayon). La tartine est touchée quand son cercle mord une gélule, et « Frôlé » compte quand elle passe à moins de 11 px sans toucher.
- Couteau à beurre, fourchette, couteau à pain : une seule gélule, fine.
- Depuis le 29/10/2026 (demande d'Adrien, pour moins de frustration) : avant, une seule grosse gélule par arme laissait une grande zone vide autour des manches. Maintenant :
  - rouleau : le corps (58 × 21 px) et une gélule fine de 9 px pour les poignées ;
  - fouet : le manche (9 px) et la tête ovale (16 px) ;
  - hachoir : la lame couverte par deux gélules, coins compris, et le manche (8 px).
- Le solveur garde une seule gélule qui englobe toutes les parties (`reach`, et `spinReach` pour une arme qui tourne) : il reste prudent. Pour le hachoir elle grandit de 2,5 px, car les coins de la lame comptent maintenant. `npm test` après le changement : 0 mort et 0 blocage sur 100 parties, 9,5 % d'attaques remplacées (9,4 % avant).
- Infos, onglet Armes : le contour exact de chaque zone en pointillés jaunes sur un liseré sombre, lisible aussi sur la tartine (avant, le cercle de la tartine se perdait dans le jaune du dessin).

## Progression de la difficulté

- **Fin de la complexification : 80 s.** Dernière nouvelle attaque à 54 s, rythme maximal à 52 s, pluies et éventails au maximum à 60 et 64 s, vitesse maximale à 80 s. Au-delà, plus rien ne change.
- Tout est aléatoire. La difficulté monte en continu et les attaques arrivent une par une, à peu près toutes les 4 à 8 s.
- Jamais plus de 3 fois la même attaque d'affilée. Une attaque qui vient de sortir a deux fois moins de chances de ressortir (quatre fois moins au deuxième coup).
- Les grosses figures (croix, couloir, double pluie) ne sortent jamais deux fois de suite.
- Pas encore de phases (moments calmes, pics) : remis à plus tard, voir « À brainstormer ».
- Le calendrier complet, généré depuis le code, est dans la bulle d'info du jeu, onglet Attaques, carte « Progression ».

```
temps     0   6   10  14  18  24  28  32  38  46  52  54  60  64      80 s
          |---|---|---|---|---|---|---|---|---|---|---|---|---|-------|---->
visé      ######################################################################
pluie         ##################################################################
hachoir           ##############################################################
mur                   ##########################################################
rouleau                   ######################################################
éventail                      ##################################################
fouet                             ##############################################
croix                                 ##########################################
couteau à pain                            ######################################
couloir                                       ##################################
double pluie                                          ##########################
vitesse   x1,0 ............................................................ x2,6
rythme    1 attaque / 1,25 s .......................... 1 / 0,42 s
```

| Réglage | Valeur |
|---|---|
| Vitesse des couverts | × (1 + t / 50), plafond × 2,6 atteint à 80 s |
| Délai entre deux attaques | 1,25 s - 0,016 × t, jamais moins de 0,42 s (atteint à 52 s) |
| Délai après l'attaque | × 1 (visé), 1,1 (hachoir), 1,2 (couteau à pain), 1,3 (rouleau, fouet), 1,5 (pluie, éventail), 1,6 (croix), 1,7 (mur), 1,8 (double pluie), 2,2 (couloir) |
| Hasard sur le délai | ± 15 % |
| Chances de tirage | visé 3, pluie 1,4, mur 1,1, éventail 1,1, hachoir 0,9, rouleau 0,8, fouet 0,7, croix 0,7, couteau à pain 0,7, couloir 0,6, double pluie 0,6 (parmi les attaques débloquées) |
| Vitesse de base | hachoir 300 px/s, couteau à pain 240, visé 230, éventail 200, croix 190, pluies 190, mur et couloir 150, rouleau 110, fouet 100 |

Équilibrage mesuré le 28/10/2026 avec un « robot humain » (il ne revoit son plan que toutes les 0,25 s et bouge à 320 px/s au plus), puis un robot plus fort (0,12 s, 420 px/s), 60 parties chacun :

| Robot | Survie (quart, médiane, trois quarts, max) | Attaque la plus meurtrière |
|---|---|---|
| Humain (0,25 s, 320 px/s) | 15 s, 31 s, 46 s, 89 s | éventail, croix, couteau à pain, couloir : 6 à 8 % des lancers |
| Fort (0,12 s, 420 px/s) | 43 s, 54 s, 67 s, 128 s | double pluie 6,5 %, pluie et croix 3,6 % |

- Les morts s'étalent sans pic à l'arrivée d'une attaque. Le robot fort meurt surtout entre 50 et 60 s, quand le rythme est au maximum.

- Le fouet et la croix tuaient 10 % du temps à leur arrivée : ralentis et annoncés plus tôt.
- Aucune attaque ne crée de pic de morts à son arrivée.
- Joueur immobile : mort vers 2,9 s. Robot parfait (qui suit le solveur) : tient 150 s.

## Équité : jamais de situation impossible

- Avant chaque attaque, le jeu simule les 3,5 s suivantes avec tous les couverts en vol et annoncés, plus l'attaque candidate.
- Temps de réaction : le solveur suppose que la tartine ne bouge pas pendant les 0,1 s qui suivent. Une attaque qui ne laisse une issue qu'en réagissant à l'instant est refusée.
- Rebond : le solveur suit le couteau à pain jusqu'au bord, puis dans l'autre sens.
- Ajouté le 28/10/2026 : sans cette marge, le couloir pouvait créer des pièges où il fallait partir dans la bonne direction à l'instant même (le robot y mourait 2 fois sur 100). Comparé sur 100 parties : 0,07 s refuse 9 % des attaques, 0,1 s en refuse 12 %, 0,17 s en refuse 20 % et double le temps de calcul. Retenu : 0,1 s.
- Il cherche un chemin pour la tartine : grille de cases de 12 px, pas de 1/30 s, doigt à 360 px/s au plus, marge de 11 px autour de chaque couvert.
- Sans chemin, l'attaque est remplacée par une autre (jusqu'à 5 essais, un par image).
- Le modèle est prudent : si le robot passe, un humain peut passer.
- La garantie vaut au moment où l'attaque est lancée. Un joueur peut toujours se coincer tout seul ensuite.
- `npm test` fait jouer le robot pendant 100 parties de 150 s, avec puis sans le solveur.
- Résultat du 28/10/2026 avec toutes les attaques (couloir élargi, grosses figures jamais deux fois de suite) : 0 mort et 0 blocage sur 100 parties de 150 s, 9 % d'attaques refusées puis remplacées.
- Résultat précédent (avant les ustensiles) : 0 mort et 0 blocage sur 100 parties de 150 s avec le solveur ; 39 morts sans. 12 % des attaques sont refusées puis remplacées. Calcul : environ 50 % plus lourd qu'avant les nouvelles figures (de l'ordre de 3 à 4 ms par vérification sur PC, jusqu'à 25 ms dans les cas chargés) : à surveiller sur téléphone.

## Écrans

- Première visite : sous le titre, la phrase « Esquive les couverts le plus longtemps possible » (seulement tant qu'on n'a pas de pseudo), puis le champ pseudo et le bouton « C'est parti », à tout moment (le classement général tourne en permanence).
- Accueil pendant une soirée : « Fin dans » juste sous le titre (depuis le 29/10/2026), puis en bas record et place de la soirée, Jouer, puis Classement et Succès côte à côte.
- La tartine de l'accueil flotte au milieu de l'espace libre entre le titre et les boutons (position recalculée toutes les 0,5 s), pour ne jamais passer derrière l'interface, même sur un petit écran.
- Accueil hors soirée : record et place au classement général. Message « Bravo X ! » pendant 12 h après une soirée, sinon « Prochaine soirée samedi 07/11 à 19h30 » si elle est créée, avec « Début dans » le dernier jour.
- Fin de partie : « Tartinée ! », temps, badge « Nouveau record » (record de la soirée pendant une soirée, record perso sinon), succès de la partie, record et place, puis Rejouer, Classement et Succès côte à côte, Accueil en dessous (ajoutés le 29/10/2026 pour retrouver tout ce qu'a l'accueil). « Fin dans » est tout en bas, entre les boutons ronds Paramètres et Infos, pendant une soirée. « Rejouer » est bloqué 0,45 s pour éviter de relancer par erreur. La tartine écrasée n'est plus dessinée derrière l'écran de fin. Le badge « Nouveau record » est sur un rouge plus foncé (#c41d40, contraste 5,4:1 avec le texte crème).
- « Frôlé ! » s'affiche au-dessus de la tartine à chaque frôlé, et s'efface à la mort pour ne pas contredire « Tartinée ! ».
- Boutons : le gros bouton jaune et les rangées en dessous ont la même largeur (18rem au plus) ; les boutons secondaires vont par deux, tous de la même taille, 44 px de haut au moins pour le doigt.
- Cadre du terrain : il n'apparaît qu'en partie (fondu de 0,2 s au départ et à la mort). Sur l'accueil, la fin et le classement, l'interface prend tout l'écran sans que le trait du cadre la coupe, quelle que soit la forme du téléphone. Les alertes d'attaque au bord ne sont dessinées qu'avec le terrain.
- Fond (depuis le 29/10/2026, demandé par Adrien) : les planètes des affiches défilent en boucle derrière tout, sur l'accueil comme en partie, une à la fois en alternant gauche et droite : planète violette à anneau, petites lunes vertes, planète pancake avec pot de confiture, planète verte à anneau, planète enceintes (ondes qui pulsent), petite planète orange. Dessinées dans le code (`public/js/app/planets.js`, couleurs `SKY` dans `palette.js`), sombres pour ne pas gêner la lecture des couverts. Planète pancake et planète enceintes reprises le 29/10/2026 (Adrien trouvait qu'on aurait dit des images collées) dans le style de l'affiche de la 1re édition : contours foncés, enceintes et cratères aplatis vers le bord comme sur une boule, ondes qui partent de la planète. Deuxième passe le même jour : la pile de pancakes (coulures vertes, pot de confiture) est posée sur le dessus de la planète avec son ombre sur le sol, au lieu d'être collée devant ; et les deux planètes ont le même dégradé d'ombre que les autres (de clair en haut à gauche à 72 % d'ombre au bord) pour ne pas ressortir plus qu'elles. Elles avancent à 20 px/s en partie (plus vite quand le jeu accélère, comme les étoiles) et à 10 px/s hors partie ; une nouvelle planète arrive toutes les demi-hauteurs d'écran.
- Tailles d'écran (revu le 29/10/2026 après une critique de l'interface) : vérifié sans chevauchement ni débordement de 320×480 à 430×932 (iPhone SE dans Safari 375×548, Android 360×640, iPhone récents 390×664, Pixel 412×780, Pro Max 430×932). Les tailles verticales (titre, temps, gros bouton, espacements) suivent la hauteur visible de l'écran (unité `svh`) ; les titres de page rétrécissent avec la largeur pour tenir entre les boutons ronds du haut ; le contenu du bas s'arrête au-dessus des boutons ronds du bas.
- Effets de fête (idée d'Adrien, depuis le 29/10/2026) :
  - En pleine partie, quand le temps dépasse ton record : le chrono passe en jaune avec un petit rebond, « Record x,xx » devient « Nouveau record » et quelques confettis partent du chrono. Pas au tout premier essai (pas encore de record).
  - En pleine partie, quand le temps dépasse le 1er du classement (de la soirée pendant une soirée, général sinon) : même chose en doré avec « N°1 ! ». Seulement si la partie compte (pseudo choisi, réseau au départ) et si le 1er n'est pas déjà toi.
  - Fin de partie avec un nouveau record : le temps rebondit et une gerbe de confettis part du score.
  - Fin de partie avec la 1re place confirmée par le serveur : le badge devient « N°1 ! » en jaune, grosse gerbe dorée et pluie de confettis sur tout l'écran, en plus de la fanfare.
  - Les confettis sont dessinés par `public/js/app/party.js` sur un calque au-dessus de tout (`#party`), qui ne bloque pas les doigts. Rien ne bouge si le téléphone demande moins d'animations.
- Classement : deux onglets, Soirée et Général (Tous les temps). Top 50, ta ligne en jaune, mis à jour toutes les 10 s. L'onglet Soirée n'existe que pendant une soirée et les 12 h qui suivent.
- Bulle d'info (bouton rond « i » en bas à droite, sur l'accueil et la fin de partie) : onglets Attaques (progression : la liste des étapes avec leur temps, sans résumé au-dessus depuis le 29/10/2026 car il répétait la liste ; règles, chaque attaque avec ses infos et un aperçu animé en boucle) Armes (carte « Taille réelle » : tous les ustensiles et la tartine à leur taille réelle sur cet écran, avec leur zone de touche, puis les variantes rares) et Crédits (deux cartes au même format que les Paramètres : titre, une ligne de texte, un bouton « Écouter sur Spotify » ou « Voir Mixkit »). Depuis le 29/10/2026, plus de mention « En jeu » (badges des attaques, titre et tailles des armes) : seuls les prototypes, visibles par les admins, gardent leur badge. Toute la page défile, comme une page web ; le titre « Infos » et les onglets forment un en-tête collé tout en haut de l'écran (sans espace où la page défilerait au-dessus), avec la croix pour fermer à côté du titre, et « Retour » est tout en bas. Succès et Paramètres ont le même en-tête collé. Les règles sont écrites avec des mots de joueur (plus de « solveur » ni de formule).
- Police : Bungee partout, chargée depuis Google Fonts.
- Deux boutons ronds, cachés pendant la partie et dans la page d'info : la note de musique en haut à gauche coupe ou remet la musique, le haut-parleur en haut à droite coupe ou remet les bruitages. Chaque choix est mémorisé sur le téléphone.
- Bouton rond Paramètres (roue crantée) en bas à gauche de l'accueil et de la fin de partie, pour tout le monde. Les boutons du bas sont posés dans les coins, hors de la mise en page : ils ne décalent rien.
- Paramètres : « Son » (deux curseurs, Musique et Bruitages, voir plus bas), « Installer le jeu » (bouton Installer quand le navigateur le permet, sinon la marche à suivre ; la carte disparaît quand le jeu est ouvert depuis l'appli installée) et « Partager le jeu » (« Partager le lien » ouvre le partage du téléphone, ou copie le lien sur ordinateur ; « QR code » l'affiche en grand pour le faire scanner à un voisin ; les deux boutons sont côte à côte, leur texte rétrécit avec la largeur de l'écran, 11 px au plus petit sur 320 px). Les téléphones connectés en admin ont en plus un onglet Admin qui affiche directement le tableau de bord sous les onglets (voir « Admin »).
- Bouton « Retour » (Infos, Succès, Paramètres, Classement, QR code) : collé en bas de l'écran quand la page tient sans défiler, juste après le contenu sinon (classe `back`).
- Pop-up « Installe le jeu » : une seule fois par téléphone, sur l'accueil, une fois le pseudo choisi. Sur Android, bouton Installer ; sur iPhone, la marche à suivre (pas de bouton possible). Jamais si le jeu est déjà installé.

## Succès

Décidé avec Adrien le 29/10/2026 : 4 familles, gardés sur le téléphone, montrés en pleine partie, en fin de partie et sur une page. La collection d'objets viendra plus tard, à part.

| Famille | Succès |
|---|---|
| Temps | Premiers pas (10 s), Bien beurrée (20 s), Croustillante (30 s), Dorée à point (45 s), Une minute de gloire (60 s), Tartine de légende (80 s, bout de la montée) |
| Frôlés et découvertes | Ça passe (5 frôlés dans une partie), Ça passe crème (20), Confiture !, Pâte à tartiner !, Miel !, Ketchup ?! (voir un couteau de cette tartinade rare), Tout vu (voir les 11 attaques, sur plusieurs parties) |
| Assiduité et soirées | Dix tartines (10 parties), Boulangerie (50), Accro à la croûte (100), Fidèle du Space (jouer à 3 soirées), Dans le top (top 10 d'une soirée), Tartine d'or (finir 1er d'une soirée) |
| Secrets | Tartinée express (moins de 2 s), En détente (5 s sans bouger, appelé « Zen » avant le 29/10/2026), Chiffre rond (finir pile sur x,00). Affichés « ??? » tant qu'ils ne sont pas débloqués |

- Gardés sur le téléphone (`cv-succes` dans le stockage du navigateur) : cumulés sur toutes les soirées, sans rien côté serveur sauf le nombre de parties (voir plus bas), aucun effet sur le classement. Perdus si on change de téléphone ou de navigateur. Les parties d'entraînement (sans pseudo) comptent aussi.
- Plusieurs fenêtres du jeu ouvertes sur le même téléphone (onglet et appli installée sur Android, deux onglets sur ordinateur) partagent les mêmes succès : chaque déblocage relit d'abord ce qui est enregistré (corrigé le 29/10/2026 : une fenêtre restée ouverte pouvait effacer les succès d'une autre, qu'on redébloquait ensuite).
- Sur iPhone, Safari et l'appli installée sur l'écran d'accueil ont chacun leur propre stockage : un succès eu dans Safari se redébloque dans l'appli installée. Seul un stockage sur le serveur, lié au pseudo, réglerait ça.
- Nombre de parties (Dix tartines, Boulangerie, Accro à la croûte) : on prend le plus grand entre le compteur du téléphone et celui du serveur (`run_count` du profil, envoyé par `/api/board` dans `me.runs`). Corrigé le 29/10/2026 après un signalement d'Adrien : le compteur du téléphone n'existait que depuis l'arrivée des succès et repartait de zéro à chaque changement d'adresse, de navigateur ou entre Safari et l'appli installée. Le serveur ne compte que les parties envoyées avec un pseudo ; le téléphone compte aussi l'entraînement et les parties hors ligne.
- En fin de partie, la ligne « ★ » rappelle les succès débloqués pendant cette partie, y compris ceux déjà montrés par le bandeau en jeu : ce n'est pas un second déblocage.
- En pleine partie : un petit bandeau jaune « ★ Nom » sous le chrono pendant 2,6 s (plusieurs succès d'un coup s'ajoutent à la suite).
- En fin de partie : une ligne « ★ Nom, Nom » sous le temps avec les succès de la partie ; la toucher ouvre la page Succès.
- Page Succès : bouton « Succès 7/22 » sur l'accueil. Une carte par famille ; un succès obtenu a une étoile pleine jaune (★), un succès à débloquer une étoile vide grise (☆) et son nom en gris : la forme change aussi, pas seulement la couleur.
- « Dans le top » se débloque à la réponse du serveur en fin de partie ; « Tartine d'or » quand le classement de la soirée est fermé et que tu es 1er (vu au rafraîchissement suivant).
- Code : `public/js/app/achievements.js` (liste, conditions et page). Ajouter un succès : une ligne dans `ACHIEVEMENTS` et sa condition dans `runTick`, `runEnd`, `afterSubmit` ou `onBoard`.

## Écran géant

- Page `/ecran` (demandée par Adrien le 29/10/2026), publique, pensée pour un écran en paysage : classement à gauche, QR code à droite avec « Scanne pour jouer », l'adresse et le nombre de joueurs.
- Pendant une soirée et les 12 h qui suivent : classement de la soirée avec son nom ; sinon : classement général. Top 10, le 1er en jaune, les 2e et 3e plus grands.
- En haut : « Fin dans » pendant la soirée, « Début dans » le dernier jour avant, sinon la date de la prochaine soirée, ou « Bravo X ! » après.
- Mise à jour toute seule toutes les 10 s. Une ligne dont le temps change (ou qui entre dans le top) clignote ; quand le 1er change, sa ligne rebondit et une pluie de confettis tombe.
- Fil en direct sous le QR code (29/10/2026) : les 4 derniers événements des 15 dernières minutes, du plus récent au plus ancien. « X vient de faire 45,12 s » quand quelqu'un bat son record (de la soirée pendant une soirée, perso sinon), « Bienvenue X ! » à chaque nouveau pseudo. Une nouvelle ligne apparaît en glissant. Joueurs retirés exclus. Route publique `GET /api/feed`, appelée seulement par l'écran géant.
- Bouton « Plein écran » en bas à droite : passe en plein écran et empêche l'écran de se mettre en veille (si le navigateur le permet). La souris se cache après 3 s sans bouger.
- Se recharge toute seule après une mise en ligne, pour rester à jour toute la soirée.
- Lien : bouton « Écran géant » dans la carte de la soirée du tableau de bord (donc aussi dans Paramètres, onglet Admin).
- En portrait (tablette, téléphone), le QR code passe au-dessus du classement.

## Musique

- Le jeu lit `public/music/theme.m4a` ou `public/music/theme.mp3` (le premier trouvé).
- En prod : « Roundabout » de Blacklolita (M4A, 3 min 57, 3,8 Mo), choisi par Adrien en attendant les morceaux des collègues.
- Le fichier n'est pas dans git (droits et poids) : il est seulement dans `public/music/` sur le PC. À remettre là avant un déploiement depuis un autre ordinateur.
- Changer de musique : remplacer `public/music/theme.m4a`, mettre à jour `MUSIC_CREDIT` dans `public/js/app/audio.js` (titre, artiste, lien), puis `npm run deploy`.
- Crédits visibles dans Infos, onglet Crédits, avec un bouton vers le morceau sur Spotify.
- Elle ne joue que pendant une partie : elle repart du début à chaque partie, pour que la montée du morceau suive la montée de la difficulté, et s'arrête en fondu à la mort. Silence sur l'accueil et l'écran de fin.
- Le bouton musique ne lance rien : il mémorise seulement le choix pour les prochaines parties.
- Si le morceau prend du retard sur la partie (réseau lent, téléphone qui rame), le jeu le recale dès que l'écart dépasse 0,35 s.
- Les navigateurs bloquent le son tant qu'on n'a pas touché l'écran. Le premier appui prépare la musique en silence. Si le téléphone bloque quand même au lancement, la musique démarre au premier lever de doigt, calée sur le temps de la partie.
- Elle se met en pause quand l'appli passe en arrière-plan.
- Droits : diffuser un morceau dans une appli publique demande l'accord de l'artiste ou du label. Le plus simple : demander à Blacklolita, ou prendre un morceau d'un DJ du collectif.
- Poids : viser moins de 5 Mo (MP3 à 128 kb/s) pour le réseau du lieu.

## Bruitages

- Sons de la banque [Mixkit](https://mixkit.co/free-sound-effects/game/), choisis par Adrien à l'écoute le 28/10/2026, dans `public/sfx/`.
- Licence Mixkit, d'après sa FAQ : gratuite, usage commercial et jeux permis, pas de mention obligatoire, pas de compte. Le texte officiel de la licence n'a pas pu être relu (page chargée en JavaScript) : à vérifier sur https://mixkit.co/license/ avant toute diffusion hors soirée.
- Une première version fabriquée dans le code a été abandonnée : les sons ne collaient pas assez à leur rôle.

| Moment | Son Mixkit (n°) | Fichier | Volume |
|---|---|---|---|
| Départ | Player select notification (2037) | `start.mp3` | 0,85 |
| Frôlé | Dagger woosh (1487) | `near.mp3` | 0,8 |
| Mort | Retro arcade lose (2027) | `death.mp3` | 0,4 |
| Nouveau record | Quick win video game notification (269) | `record.mp3` | 1 |
| Passer 1er | Successful horns fanfare (722) | `first.mp3` | 1 |

- Curseurs de volume dans Paramètres, carte « Son » (demande d'Adrien, 29/10/2026) : Musique et Bruitages, de 0 à 100 %, gardés sur le téléphone (100 % par défaut). En lâchant le curseur, on entend 2 s de musique (à partir de 30 s du morceau) ou le son « Nouveau record ». Monter un curseur rallume le son s'il était coupé par le bouton rond.
  - Sur iPhone, le navigateur bloque le volume d'un lecteur audio : la musique passe alors par Web Audio avec son propre réglage de volume (détecté tout seul, rien ne change sur Android et ordinateur). À vérifier sur un iPhone.
- Volumes égalisés à la mesure : « Retro arcade lose » était près de 3 fois plus fort que les autres. Un seul frôlé part toutes les 0,08 s au plus.
- 29/10/2026 : « Arrow whoosh » retiré (moins satisfaisant), « Dagger woosh » gardé seul à son volume d'origine, qu'Adrien trouve très bon. Mesuré : les frôlements sont aussi fréquents qu'avant, 5 à 6 par minute de jeu.
- Le jeu attend la réponse du serveur (1,2 s au plus) pour savoir s'il joue le record ou la 1re place.
- Pas de son sur les annonces d'attaque : trop fréquent, et ça avantagerait ceux qui jouent avec le son.
- Les sons sont préparés dès l'ouverture du jeu. Un son qui ne peut pas partir à temps (téléphone qui bloque encore le son) est abandonné plutôt que joué en retard.
- Écouter les sons : carte « Bruitages » en bas du tableau de bord admin.
- Coupés par le bouton haut-parleur, indépendamment de la musique.
- Sur iPhone, le bouton silencieux du téléphone coupe les bruitages mais pas la musique (règle d'Apple).
- Changer un son : remplacer le fichier dans `public/sfx/`, ou ajouter une variante dans `SOUNDS` (`public/js/app/audio.js`) avec son volume.
- Page d'écoute des candidats (hors git) : `ecoute-sons/`, lancée avec `node ecoute-sons/serve.mjs` puis http://127.0.0.1:8790.

## PWA et mises à jour

- Le jeu s'installe comme une appli : sur Android, pop-up du jeu ou bouton Installer dans Paramètres ; sur iPhone, Partager puis « Sur l'écran d'accueil ».
- Service worker : il passe toujours par le réseau d'abord et garde une copie en secours, donc le jeu s'ouvre même sans réseau s'il a déjà été ouvert une fois.
- Chaque `npm run deploy` crée une version (date + commit), écrite dans `public/js/version.js` et donnée au serveur.
- Le jeu compare sa version à celle du serveur à l'ouverture, au retour dans l'appli et toutes les 30 s sur l'accueil. Si elle a changé, il se recharge tout seul, jamais en pleine partie.
- Le serveur refuse l'inscription et le début de partie d'une ancienne version (erreur 426), et le jeu se recharge aussitôt.
- Garde-fou : un seul rechargement automatique toutes les 15 s au plus.
- Testé en ligne le 28/10/2026 : rechargement automatique après un déploiement, et partie refusée puis rechargement pour une ancienne version.

## Admin

- Même appli que le jeu : une seule installation. Un téléphone connecté en admin trouve le tableau de bord dans Paramètres (roue crantée en bas à gauche), onglet Admin, affiché directement sous les onglets depuis le 29/10/2026 (demande d'Adrien).
  - Technique : la page `/admin` est chargée dans un cadre (`iframe`) seulement quand l'onglet Admin est ouvert, et retirée quand on le quitte (pas de rafraîchissement en arrière-plan). Le cadre prend la hauteur de son contenu, donc toute la page Paramètres défile d'un bloc. Dans le cadre, `/admin` cache son en-tête (« Croûte Admin », « Retour au jeu ») grâce à la classe `embedded`.
  - `_headers` autorise le cadre seulement depuis le même site (`frame-ancestors 'self'`, au lieu de `'none'`).
  - Se déconnecter dans le cadre fait disparaître l'onglet Admin tout de suite.
  - `/admin` ouvert seul (lien d'invitation, ordinateur) garde son en-tête et « Retour au jeu ».
- Accès caché : 5 appuis rapides sur « Collectif Tartine Sauvage » ouvrent l'écran admin.
- Connexion sans mot de passe, le téléphone reste connecté.
- Dans l'appli installée (surtout sur iPhone, où les liens s'ouvrent dans Safari), on peut coller le lien d'invitation dans « Lien d'invitation reçu ».
- Premier accès : la clé admin (`cle-admin.txt`) crée un compte propriétaire. Elle reste la clé de secours.
- Le propriétaire invite les collègues : prénom + rôle, puis un lien à usage unique, valable 48 h, à envoyer. La personne l'ouvre et elle est connectée.
- Rôles : propriétaire (soirées, joueurs et équipe) et admin (soirées et joueurs).
- Chaque téléphone connecté apparaît dans « Équipe » et peut être retiré : il est déconnecté aussitôt.
- On ne peut pas retirer le dernier propriétaire.
- Une seule page : la soirée, les classements, l'équipe et les bruitages. Les armes et les attaques sont dans la bulle d'info du jeu, pour tout le monde (29/10/2026 : retirées de l'admin pour éviter le doublon).
- Tableau de bord : soirée en cours, fin du classement avec compte à rebours, joueurs, parties, record, classement mis à jour toutes les 10 s, bouton pour retirer un tricheur.
- « À vérifier » (trait rouge), avec la raison :
  - « score très haut » : record de 90 s ou plus (29/10/2026). Le robot « humain » plafonne vers 89 s et atteindre 80 s est déjà très dur : un tel score mérite un coup d'oeil.
  - « partie ralentie » : le record a pris nettement plus de temps réel que le score (plus de 15 % et 15 s d'écart). Signe d'un jeu ralenti exprès, ou d'une appli mise en arrière-plan en pleine partie.
- Un bandeau rouge en haut du classement compte les records à vérifier (hors joueurs déjà retirés), pour les repérer sans faire défiler.
- Une soirée a un début et une fin : on peut la créer à l'avance pour l'annoncer dans le jeu. Une seule soirée à la fois, en cours ou prévue : pour en créer une autre, avancer d'abord la fin de la précédente à maintenant.
- La carte de la soirée dit si elle est en cours, prévue (avec le compte à rebours du début) ou terminée. « Modifier » change son nom, son début et sa fin.
- Le classement du tableau de bord a deux boutons : Soirée (les joueurs de la soirée) et Général (tous les joueurs).
- « Retirer » retire le joueur de tous les classements (soirée et général).
- Les liens et les connexions sont stockés chiffrés (empreinte SHA-256) en base.

## Soirées et classements

Décidé par Adrien le 29/10/2026 :

- Profil gardé : un téléphone garde son pseudo pour toujours, unique sur tout le jeu.
- Deux classements : celui de la soirée (pour le lot) et le général, qui tourne en permanence. Un score fait pendant une soirée compte dans les deux.
- Une seule soirée à la fois.
- Entre deux soirées, l'accueil montre le classement général et la prochaine soirée annoncée.
- En base : `profiles` (joueurs et record général), `entries` (record de chaque joueur à chaque soirée), `runs` (chaque partie, avec sa soirée s'il y en avait une), `events` (début et fin).
- Les joueurs et records de la soirée test du 28/10 ont été repris tels quels (migration `0004_profiles.sql`).

## Classement et triche

- Pseudo de 2 à 16 caractères, unique sur tout le jeu (majuscules, accents et espaces ignorés).
- À égalité, le premier à avoir fait le temps passe devant.
- Pseudo en lettres latines (accents permis), chiffres, espaces, tirets : les sosies avec des lettres cyrilliques ou grecques sont refusés.
- Le serveur refuse un score plus long que le temps réellement écoulé depuis le début de la partie (5 s de marge pour les réseaux lents), et tout score au-delà de 15 min.
- Un score renvoyé deux fois (réseau qui coupe) est compté une seule fois, sans message d'erreur.
- Pas de compte : le téléphone garde un jeton. Le même téléphone qui reprend son pseudo retrouve son compte. Un autre navigateur (Safari puis appli installée sur iPhone) oblige à prendre un nouveau pseudo.
- Limites contre les abus : 150 inscriptions par minute et par adresse IP (montée de 30 à 150 le 29/10/2026 : tout le lieu partage souvent la même adresse sur le wifi, et le rush du début aurait bloqué le 31e), 30 tentatives de connexion admin par minute et par adresse IP (limite à part, `ADMIN_LIMIT`), 10 débuts de partie par 10 s et par joueur.
- Faille connue : quelqu'un d'habile peut lancer une partie, attendre, puis envoyer un faux score plausible. Parade actuelle : les records de 90 s et plus sont signalés dans l'admin (bandeau rouge), on retire le joueur si besoin. Un faux score plus modeste (par exemple 60 s) passe inaperçu. Parade complète possible : rejouer la partie à partir des gestes enregistrés (voir « À faire »).

## Check-list d'une soirée

Avant :

- Dans le tableau de bord, « Nouvelle soirée » : nom, début et fin. On peut le faire plusieurs jours avant : le jeu l'annonce. Le classement de la soirée part de zéro, le général continue.
- Imprimer le QR code pour les tables, le bar et l'écran si le lieu en a un.
- Faire une partie depuis le QR code pour vérifier.
- Si le lieu a un écran : ouvrir `/ecran` sur l'ordinateur branché dessus, puis « Plein écran ».

Pendant :

- Surveiller le bandeau rouge « à vérifier » dans Croûte Admin et retirer le joueur si besoin.
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
| `public/js/app/planets.js` | Dessin des planètes du fond et leur ordre de passage (`BODIES`) |
| `public/js/app/party.js` | Confettis et rebonds des effets de fête (record, N°1) |
| `public/js/app/achievements.js` | Succès : liste, conditions, page Succès |
| `public/js/app/screens.js` | Écrans HTML : accueil, fin, classement, boutons |
| `public/js/app/settings.js`, `install.js` | Paramètres, partage, QR code et installation de l'appli |
| `public/js/app/api.js` | Appels au serveur, classement, mise à jour de version |
| `public/js/app/audio.js` | Musique, bruitages et leurs volumes |
| `public/sfx/` | Bruitages Mixkit |
| `public/js/app/input.js` | Glisser du doigt et souris (le rond sous le doigt est dessiné par `scene.js`) |
| `public/js/shared/` | Stockage du téléphone, formats et couleurs (`palette.js`, avec les tartinades), partagés avec l'admin |
| `public/js/admin/admin.js`, `public/admin.html`, `admin.css` | Tableau de bord admin |
| `public/js/ecran/ecran.js`, `public/ecran.html`, `ecran.css` | Écran géant (classement plein écran) |
| `public/js/app/catalog.js`, `public/catalog.css` | Pages Attaques, Armes et Crédits de la bulle d'info |
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
| `qr/` | QR codes (stylé et simple), générés par `scripts/qr.mjs` |

| Commande | À quoi ça sert |
|---|---|
| `npm install` | Installer les outils |
| `npm run db:local` | Créer la base locale (à refaire si la base change) |
| `npm run dev` | Jeu en local sur http://localhost:8787, admin avec la clé de `.dev.vars` |
| `npm test` | Robot du solveur, 0 mort attendu (environ 4 min) |
| `npm run check` | Vérifier les types de l'API |
| `npm run deploy` | Mettre en ligne avec une nouvelle version (les téléphones se mettent à jour seuls) |
| `npm run icons` | Regénérer les icônes de l'appli |
| `npm run qr` | Regénérer les QR codes (stylé, simple et celui du jeu) |
| `npm run test:api` | Tester l'API joueurs et admin (avec `npm run dev` lancé) |
| `npm run db:remote` | Appliquer une nouvelle migration sur la base en ligne |

## Ajouter du contenu

- Nouvelle attaque : une fonction dans `attacks.js` qui renvoie ses avertissements et projectiles, puis une ligne dans `ATTACKS` (à partir de quand, poids, durée). Le solveur la vérifie tout seul.
- Nouveau projectile : sa taille dans `projectiles.js` et son dessin dans `sprites.js` (même nom).
- Prototype : `lab: true` dans `ATTACKS` ou `PROJECTILES`. Il apparaît dans la bulle d'info des seuls téléphones connectés en admin, mais n'est jamais tiré en jeu. Pour le mettre en jeu : retirer `lab`, régler `from` et `weight`, puis `npm test`.
- Grosse figure qui ne doit jamais sortir deux fois de suite : `solo: true` dans `ATTACKS`.
- Ce qui grossit avec le temps à l'intérieur d'une attaque : `growsUntil` et `growth` dans `ATTACKS`, pour que l'admin l'affiche dans la progression.
- Nouvelle tartinade rare : une ligne dans `SPREADS` (`palette.js`) et son nom dans `RARE_SPREADS` (`projectiles.js`).
- Nouveau bruitage : voir « Bruitages ».
- Nouvel événement de partie (objet ramassé, etc.) : `sim.js` le renvoie dans la liste d'événements de `step`, et `main.js` y réagit dans `ON_SIM`.
- Nouvelle route d'API : une fonction dans `src/routes/` et une ligne dans la liste de `src/worker.ts`, avec le niveau d'accès (public, admin, propriétaire).
- Toujours relancer `npm test` après avoir touché au jeu : 0 mort attendu.

## À faire

- Reprendre les couleurs et la tartine des affiches. Fichiers reçus du designer le 29/10/2026 dans `affiches/` (hors du site en ligne) :
  - `space-tartinade-1-2026-03-07.webp` : planète pancake avec pot de confiture, planète enceintes violette et verte, nébuleuse violette ;
  - `space-tartinade-2-2026-05-09.webp` : planète verte à anneau, petites lunes vertes, tartine-fusée ;
  - `space-tartinade-3-2026-11-07.webp` : affiche rétro de la 3e édition, île tête de mort, palmiers ;
  - `tartine-fusee.webp` : la tartine-fusée seule, fond transparent, réutilisable telle quelle.
  - Les affiches sont aplaties : pour reprendre une planète proprement, demander au designer le fichier séparé, comme pour la tartine.
- Remplacer ou compléter la musique avec des morceaux des collègues DJ.
- Inviter les collègues admins depuis Croûte Admin.
- Créer la vraie soirée du samedi 07/11 sur `/admin`.
- Tester sur de vrais téléphones : fluidité, son, réseau du lieu.
- À décider : vérifier les meilleurs scores en rejouant la partie. Le serveur donne une graine, le jeu enregistre les gestes, et le tableau de bord rejoue les 3 premiers pour confirmer leur temps. Bloquerait la triche par faux score.

## À brainstormer

- Deuxième phase après 80 s (idée d'Adrien, pas prioritaire : atteindre 80 s est déjà très dur pour un humain) :
  - « Roundabout » commence à se calmer entre 75 et 80 s, pile quand la complexification s'arrête.
  - Si on veut prolonger la montée : passer en « mode sérieux » à 80 s, avec une deuxième musique qui pousse encore plus, une DA qui change un peu, et des attaques qui varient ou se durcissent.
  - Il faudra que le joueur sente clairement le changement de mode.
- Phases structurées, remises à plus tard par Adrien : moments calmes et pics. Piste : caler les pics sur les drops du morceau, possible car la musique repart du début à chaque partie. Je peux repérer les drops en analysant le fichier.
- Images rigolotes qui défilent dans le fond : références aux anciennes soirées et aux délires du collectif (par exemple un maximator qui tourne).
- Collection : des objets à attraper en passant la tartine dessus (par exemple le maximator qui tourne). Chaque objet trouvé rejoint la collection du joueur dans le jeu. Prévue après les succès (voir « Succès »), à part d'eux.
  - Un nombre fixe d'objets, ceux pas encore trouvés sont affichés en ombre.
  - En fin de partie, l'écran montre les objets attrapés pendant la partie.
  - À trancher : est-ce que ça donne un avantage au classement (non, pour rester juste ?), la collection est-elle liée à la soirée ou au téléphone.
- Partage du score en story Insta.
- Adresse sans « workers.dev » : il faut acheter un nom de domaine (payant chaque année), le mettre sur Cloudflare, puis brancher le jeu dessus (par exemple jeu.<domaine>). Le QR code changerait encore : à décider avant d'imprimer les affiches.

## Bon à savoir

- Base de prod vidée le 29/10/2026 après le changement d'adresse (pseudos, parties, Soirée test, connexions admin, invitations). Sauvegarde d'avant : `sauvegardes/prod-2026-10-29-avant-nettoyage.sql` (hors git, contient des jetons : à garder pour soi). Faire une sauvegarde : `npx wrangler d1 export croute-que-croute --remote --output sauvegardes/<nom>.sql`.
- `cle-admin.txt` et `.dev.vars` ne sont pas dans git : à garder de côté. Les liens d'invitation non utilisés (`invitation-*.txt`) non plus.
- wrangler est connecté au compte Cloudflare sur le PC d'Adrien (`npx wrangler whoami` pour vérifier).
- Une fois la page chargée, le jeu tourne sans réseau. Le score ne compte que si le réseau passe au début de la partie. À la fin, l'envoi est tenace (29/10/2026) : 3 essais en 3 s, puis un essai toutes les 5 s pendant 2 min, avec « Envoi en attente… » sur l'écran de fin. Le score en attente est gardé sur le téléphone (`cv-score-attente`) : si on ferme le jeu, il est renvoyé au prochain lancement dans les 2 min. Chaque essai abandonne au bout de 8 s. Un score arrivé avec plus de 15 s de retard peut s'afficher « partie ralentie » dans l'admin : à juger au cas par cas.
- Le record perso hors classement reste sur le téléphone.
- Changement d'adresse du 29/10/2026 : chaque téléphone repart de zéro sur la nouvelle adresse (pseudo, record perso, connexion admin, appli installée à réinstaller). Les scores restent en base, mais un ancien pseudo reste pris : il faut en choisir un autre. Les admins se reconnectent avec la clé admin ou une nouvelle invitation.
