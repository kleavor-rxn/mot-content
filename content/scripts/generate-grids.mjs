// Produit content/pool/crosswords.json à partir de DEUX sources :
//
//   1. crosswords.spec.json — grilles écrites à la main (thème choisi, mots choisis)
//   2. bank.json            — grilles DÉRIVÉES : on échantillonne 8 mots d'un
//                             même thème et le placeur fait le reste
//
// C'est le multiplicateur : 170 mots annotés produisent des centaines de
// grilles sans en écrire une seule de plus.
//
// Usage : node content/scripts/generate-grids.mjs [--locale=fr|en] [grilles-par-thème]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { placeWords, toPuzzle, mulberry32 } from "./lib/place-words.mjs";
import { positionalArgs, resolveLocale } from "./lib/locale.mjs";

const L = resolveLocale();
const { poolDir } = L;

const PER_THEME = parseInt(positionalArgs()[0] ?? "16", 10);
// 7 mots (et non 8) : avec la règle de séparation des mots croisés, 8 mots ne
// tiennent quasiment jamais dans une grille 9×9 sans se coller. 7 mots laissent
// respirer la grille et permettent de couvrir les 15 thèmes.
const WORDS_PER_GRID = 7;
const GRID_SIZE = 9;
const MAX_ATTEMPTS = 40; // tirages tentés par grille avant d'abandonner

// Les CLÉS de thème sont communes à toutes les langues — elles composent l'id
// de grille (`auto-cuisine-3`), qui est gelé dans le calendrier quotidien.
// Seul le titre affiché change de langue.
const THEME_TITLES = {
  fr: {
    nature: "Nature", animaux: "Animaux", maison: "La maison", cuisine: "Cuisine",
    corps: "Corps humain", ville: "En ville", transport: "Transports",
    musique: "Musique", sport: "Sport", ecole: "À l'école", mer: "Mer & marine",
    ciel: "Ciel & météo", vetement: "Vêtements", objets: "Objets du quotidien",
    metiers: "Métiers",
  },
  en: {
    nature: "Nature", animaux: "Animals", maison: "At home", cuisine: "In the kitchen",
    corps: "The human body", ville: "In town", transport: "Getting around",
    musique: "Music", sport: "Sports", ecole: "At school", mer: "Sea & sailing",
    ciel: "Sky & weather", vetement: "Clothes", objets: "Everyday objects",
    metiers: "Jobs",
  },
}[L.locale];

// MARK: - 1. Grilles écrites à la main
//
// Facultatif : une langue peut n'avoir que des grilles dérivées de sa banque.

const specPath = join(poolDir, "crosswords.spec.json");
const specs = existsSync(specPath) ? JSON.parse(readFileSync(specPath, "utf8")) : [];
const handmadeSkipped = [];
const handmade = specs.flatMap((spec) => {
  const placements = placeWords(spec.words, spec.gridSize);
  // Certaines grilles écrites à la main supposaient l'ancien empilement dense.
  // Avec la séparation stricte, celles qui ne s'agencent plus sont écartées
  // plutôt que de bloquer toute la génération.
  if (!placements) {
    handmadeSkipped.push(spec.id);
    return [];
  }
  return [toPuzzle({ ...spec, placements })];
});

// MARK: - 2. Grilles dérivées de la banque
//
// ADDITIF, et c'est essentiel : les grilles déjà produites sont CONSERVÉES
// telles quelles, la génération ne fait qu'en ajouter. Le calendrier quotidien
// gèle une date sur un identifiant (`auto-cuisine-3`) ; si le contenu de cet
// identifiant changeait à chaque enrichissement de la banque, un joueur qui
// rejoue un jour archivé trouverait une autre grille que celle qu'il a faite.
// Le tirage dépend en effet de la composition du thème : ajouter un mot suffit
// à changer toutes les grilles suivantes.
//
// `--rebuild` force la régénération complète — à ne faire que sur une langue
// dont aucune grille n'a encore été publiée.

const rebuild = process.argv.includes("--rebuild");
const previousPath = join(poolDir, "crosswords.json");
const previous =
  !rebuild && existsSync(previousPath)
    ? JSON.parse(readFileSync(previousPath, "utf8")).filter((p) => p.id.startsWith("auto-"))
    : [];

const keptByTheme = new Map();
for (const puzzle of previous) {
  const theme = puzzle.id.slice("auto-".length, puzzle.id.lastIndexOf("-"));
  if (!keptByTheme.has(theme)) keptByTheme.set(theme, []);
  keptByTheme.get(theme).push(puzzle);
}

const bank = JSON.parse(readFileSync(join(poolDir, "bank.json"), "utf8"));

// Seules les entrées utilisables en grille : 3–8 lettres, définition présente
const byTheme = new Map();
for (const e of bank.entries) {
  if (!e.clue?.trim()) continue;
  if (e.grid.length < 3 || e.grid.length > GRID_SIZE - 1) continue;
  if (!byTheme.has(e.theme)) byTheme.set(e.theme, []);
  byTheme.get(e.theme).push({ answer: e.grid, clue: e.clue, difficulty: e.difficulty });
}

// La difficulté d'une grille = celle de la majorité de ses mots
function gridDifficulty(words) {
  const counts = { facile: 0, moyen: 0, difficile: 0 };
  words.forEach((w) => counts[w.difficulty]++);
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

const generated = [];
const skipped = [];

for (const [theme, words] of [...byTheme.entries()].sort()) {
  if (words.length < WORDS_PER_GRID) {
    skipped.push(`${theme} (${words.length} mots < ${WORDS_PER_GRID})`);
    continue;
  }

  // On repart des grilles déjà publiées : leurs mots comptent comme déjà
  // tirés, et la numérotation reprend après la dernière.
  const kept = keptByTheme.get(theme) ?? [];
  const seenSignatures = new Set(
    kept.map((p) => p.clues.map((c) => c.answer).sort().join("|"))
  );
  let made = kept.length;
  let index = kept.reduce((max, p) => Math.max(max, Number(p.id.split("-").at(-1)) || 0), 0);
  generated.push(...kept);

  for (let attempt = 0; attempt < PER_THEME * MAX_ATTEMPTS && made < PER_THEME; attempt++) {
    // Graine dérivée du thème et du numéro d'essai : reproductible
    const seed = [...theme].reduce((a, c) => a + c.charCodeAt(0), 0) * 1000 + attempt;
    const rng = mulberry32(seed);

    // Tirage sans remise
    const pool = [...words];
    const pick = [];
    while (pick.length < WORDS_PER_GRID && pool.length) {
      pick.push(pool.splice(rng() % pool.length, 1)[0]);
    }

    // Deux grilles composées des mêmes mots seraient redondantes
    const signature = pick.map((w) => w.answer).sort().join("|");
    if (seenSignatures.has(signature)) continue;

    const placements = placeWords(pick, GRID_SIZE);
    if (!placements) continue; // agencement impossible : on retire au sort

    seenSignatures.add(signature);
    made++;
    index++;
    generated.push(
      toPuzzle({
        id: `auto-${theme}-${index}`,
        title: THEME_TITLES[theme] ?? theme,
        difficulty: gridDifficulty(pick),
        gridSize: GRID_SIZE,
        placements,
      })
    );
  }

  if (made < PER_THEME) skipped.push(`${theme} : ${made}/${PER_THEME} générées`);
}

// MARK: - Écriture

const all = [...handmade, ...generated];
writeFileSync(join(poolDir, "crosswords.json"), JSON.stringify(all, null, 2) + "\n");

console.log(`Écrites à la main : ${handmade.length}${handmadeSkipped.length ? ` (écartées : ${handmadeSkipped.join(", ")})` : ""}`);
console.log(
  `Dérivées de la banque : ${generated.length}` +
    (previous.length ? ` (dont ${previous.length} conservées, ${generated.length - previous.length} nouvelles)` : "")
);
for (const [theme] of [...byTheme.entries()].sort()) {
  const n = generated.filter((g) => g.id.startsWith(`auto-${theme}-`)).length;
  console.log(`  ${(THEME_TITLES[theme] ?? theme).padEnd(20)} ${n}`);
}
if (skipped.length) console.log(`\nIncomplets : ${skipped.join(", ")}`);
console.log(`\nTotal : ${all.length} grilles`);
