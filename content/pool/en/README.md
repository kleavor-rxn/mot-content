# Corpus anglais

Le pool de contenu anglais. Même schéma que le pool français à la racine de
`content/pool/` — **mêmes noms de fichiers, même format, langue différente**.
C'est ce qui permet aux scripts de rester agnostiques : ils prennent
`--locale=en` et travaillent ici sans autre changement.

## Ce qu'il contient

| Fichier | Rôle | Volume | Français, pour comparaison |
| --- | --- | --- | --- |
| `bank.json` | Banque annotée — la source dont tout dérive | **540** entrées, 15 thèmes × 36 | 451 |
| `lexicon.json` | Candidats classés par fréquence réelle | 5 655 noms communs | 7 530 |
| `wordle-accepted.json` | Essais acceptés par Mot Caché | 5 200 formes de 5 lettres | 5 037 |
| `pyramide.json` | Mot + 3 indices | **540** | 477 |
| `taboo.json` | Mot + 5 mots interdits | **540** | 481 |
| `crosswords.json` | Grilles dérivées de la banque | **480** | 478 |
| `argot.json` | Slang et idiomes anglais | **162** | 162 |
| `maudit.json` | Paires de mots proches | **160** | 160 |
| `crossword-schedule.json` | Calendrier gelé date → grille | append-only | idem |

`argot.json` ne contient pas de l'argot français traduit : l'argot ne se traduit
pas. Ce sont des expressions anglaises courantes — la décision de la stratégie C
(`docs/PLAN-LOCALISATION-EN.md`).

## Régénérer

```bash
node content/scripts/derive-pools.mjs   --locale=en   # banque → pyramide + taboo
node content/scripts/generate-grids.mjs --locale=en   # banque → grilles
node content/scripts/check-bank.mjs     --locale=en   # validation
node content/scripts/generate.mjs       --locale=en   # → public/en/ + GameData-en.json
```

Le lexique se reconstruit rarement, et demande trois sources externes non
versionnées (17 Mo) — voir l'en-tête de `content/scripts/import-english.mjs`
pour les commandes de téléchargement et les licences.

## Trois décisions à connaître avant d'y toucher

**1. Les clés de thème sont communes aux deux langues.** `nature`, `cuisine`,
`metiers`… composent l'identifiant de grille (`auto-cuisine-3`), qui est gelé
dans le calendrier quotidien. Seul le titre affiché est traduit, dans
`generate-grids.mjs`. Renommer une clé casserait l'historique.

**2. `difficulty` reste en français dans les données.** `facile`, `moyen`,
`difficile` sont des **identifiants de transport**, pas des libellés — exactement
le choix déjà acté pour `SudokuDifficulty`, dont le `rawValue` reste français
parce qu'il sert de clé de meilleur temps. La traduction se fait à l'affichage,
côté app.

**3. La difficulté vient de la fréquence, pas de l'intuition.** Chaque entrée de
la banque tire sa difficulté de `lexicon.json`, dont les bandes s'appuient sur la
fréquence d'usage réelle du **sens nominal** du mot. Une soixantaine d'entrées
font exception — des mots que le lexique écarte comme verbes homonymes (*watch*,
*judge*, *sail*, *taxi*, *scarf*…) : elles portent la mention `freqSource: raw`
et tirent leur difficulté de la fréquence brute des sous-titres, toutes
catégories confondues.

**4. La génération de grilles est ADDITIVE.** `generate-grids.mjs` conserve les
grilles existantes et se contente d'en ajouter. Le calendrier quotidien gèle une
date sur un identifiant (`auto-cuisine-3`) ; comme le tirage dépend de la
composition du thème, enrichir la banque changerait sinon le contenu de toutes
les grilles déjà servies — un joueur qui rejoue un jour archivé trouverait autre
chose. `--rebuild` force la régénération complète : à ne faire que sur une langue
dont rien n'a encore été publié.

## Ce qui manque encore, côté app

Le contenu est prêt et publiable ; l'app ne sait pas encore le demander.

- `GitHubPagesProvider.baseURL` pointe vers la racine de `mot-content` :
  l'anglais est publié sous `/en/` et personne ne le lit.
- `DataService` charge `GameData.json` ; `GameData-en.json` est embarqué à côté
  mais jamais choisi. Idem pour `WordleWords-en.json`.
- `CrosswordPuzzle.difficulty` s'affiche brut (`MotsFlechesPlayView.swift:596`)
  et se colore par comparaison avec `"facile"`/`"moyen"`/`"difficile"`. Il lui
  faut un `displayName` traduit, sur le modèle de `SudokuDifficulty`.
- La rotation du défi du jour peut désormais ouvrir un **segment daté** anglais
  incluant les jeux de mots — c'est ce que les corpus ci-dessus débloquent.
