# mot-content

Contenu quotidien de l'app iOS **Mot.** (Raxoon Studios), publié sur GitHub Pages.

- `content/pool/` — la source de vérité du contenu (mots, indices, grilles)
- `content/scripts/generate.mjs` — sélection déterministe par date → `public/`
- `content/scripts/build-crossword.mjs` — construit les grilles depuis `crosswords.spec.json`

Publié automatiquement chaque jour à 05:00 UTC :

- https://kleavor-rxn.github.io/mot-content/bundle.json — tout le contenu
- https://kleavor-rxn.github.io/mot-content/daily.json — les défis, fenêtre de 8 jours

`public/` est généré : ne pas l'éditer à la main.

## Licence et attribution

Ce contenu est publié sous **CC BY-SA 4.0**.

Le pool de mots dérive de **Lexique 3.83** (Boris New & Christophe Pallier,
<http://www.lexique.org>), lui-même distribué sous CC BY-SA 4.0. Le partage à
l'identique s'applique donc à ce dépôt.
