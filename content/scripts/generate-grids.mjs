// Produit content/pool/crosswords.json à partir de DEUX sources :
//
//   1. crosswords.spec.json — grilles écrites à la main (thème choisi, mots choisis)
//   2. bank.json            — grilles DÉRIVÉES : on échantillonne 8 mots d'un
//                             même thème et le placeur fait le reste
//
// C'est le multiplicateur : 170 mots annotés produisent des centaines de
// grilles sans en écrire une seule de plus.
//
// Usage : node content/scripts/generate-grids.mjs [grilles-par-thème]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { placeWords, toPuzzle, mulberry32 } from "./lib/place-words.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const poolDir = join(root, "content", "pool");

const PER_THEME = parseInt(process.argv[2] ?? "12", 10);
const WORDS_PER_GRID = 8;
const GRID_SIZE = 9;
const MAX_ATTEMPTS = 40; // tirages tentés par grille avant d'abandonner

const THEME_TITLES = {
  nature: "Nature", animaux: "Animaux", maison: "La maison", cuisine: "Cuisine",
  corps: "Corps humain", ville: "En ville", transport: "Transports",
  musique: "Musique", sport: "Sport", ecole: "À l'école", mer: "Mer & marine",
  ciel: "Ciel & météo", vetement: "Vêtements", objets: "Objets du quotidien",
  metiers: "Métiers",
};

// MARK: - 1. Grilles écrites à la main

const specs = JSON.parse(readFileSync(join(poolDir, "crosswords.spec.json"), "utf8"));
const handmade = specs.map((spec) => {
  const placements = placeWords(spec.words, spec.gridSize);
  if (!placements) throw new Error(`${spec.id} : aucun agencement trouvé`);
  return toPuzzle({ ...spec, placements });
});

// MARK: - 2. Grilles dérivées de la banque

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

  const seenSignatures = new Set();
  let made = 0;

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
    generated.push(
      toPuzzle({
        id: `auto-${theme}-${made}`,
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

console.log(`Écrites à la main : ${handmade.length}`);
console.log(`Dérivées de la banque : ${generated.length}`);
for (const [theme] of [...byTheme.entries()].sort()) {
  const n = generated.filter((g) => g.id.startsWith(`auto-${theme}-`)).length;
  console.log(`  ${(THEME_TITLES[theme] ?? theme).padEnd(20)} ${n}`);
}
if (skipped.length) console.log(`\nIncomplets : ${skipped.join(", ")}`);
console.log(`\nTotal : ${all.length} grilles`);
