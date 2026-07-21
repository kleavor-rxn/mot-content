// Génération du contenu publié sur GitHub Pages.
//
// Produit :
//   public/bundle.json — le pool complet au format GameBundle consommé par l'app
//                        (mise à jour du contenu sans release App Store)
//   public/daily.json  — le défi du jour (sélection déterministe par date)
//
// Déterminisme : la sélection quotidienne utilise mulberry32 avec pour graine
// la date UTC au format YYYYMMDD. L'app iOS embarque EXACTEMENT le même
// algorithme (SeededRNG dans DailyChallenge.swift) : hors ligne ou avant la
// publication du jour, elle calcule localement le même défi que le serveur.
// daily.json sert de canal de curation/override, pas de source de vérité unique.
//
// Dépôt de CONTENU : on ne publie que ces deux fichiers. Le GameData.json
// embarqué dans l'app est régénéré côté dépôt applicatif (mots-nombres-ios).
//
// Usage : node content/scripts/generate.mjs [YYYY-MM-DD]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const poolDir = join(root, "content", "pool");
const outDir = join(root, "public");

// MARK: - PRNG (identique à SeededRNG côté Swift)

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return (t ^ (t >>> 14)) >>> 0; // entier 32 bits, PAS un flottant
  };
}

// Tire `count` indices distincts dans [0, poolSize) — même boucle qu'en Swift.
function pickIndices(rng, count, poolSize) {
  const picked = [];
  while (picked.length < Math.min(count, poolSize)) {
    const idx = rng() % poolSize;
    if (!picked.includes(idx)) picked.push(idx);
  }
  return picked;
}

// Pas d'avance premier avec la taille du pool : le multiplier par le numéro de
// jour parcourt donc TOUS les indices avant d'en répéter un. Choisi près du
// nombre d'or pour que deux jours consécutifs tombent loin l'un de l'autre.
function coprimeStride(poolSize) {
  if (poolSize <= 2) return 1;
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let k = Math.max(1, Math.round(poolSize * 0.618));
  while (k < poolSize && gcd(k, poolSize) !== 1) k++;
  return k < poolSize ? k : 1;
}

// Rotation sans répétition. Une version antérieure mélangeait le pool par
// cycles indépendants : elle garantissait l'absence de doublon À L'INTÉRIEUR
// d'un cycle, mais une grille de fin de cycle pouvait revenir quelques jours
// plus tard au début du suivant (mesuré : 15 grilles distinctes sur 20 jours
// pour un pool de 20). Le pas premier donne un espacement exact de poolSize jours.
function rotatingIndex(dayNumber, poolSize) {
  if (poolSize <= 0) return 0;
  const stride = coprimeStride(poolSize);
  return (((dayNumber * stride) % poolSize) + poolSize) % poolSize;
}

// MARK: - Chargement & validation du pool

const load = (name) => JSON.parse(readFileSync(join(poolDir, `${name}.json`), "utf8"));

const pyramide = load("pyramide");
const taboo = load("taboo");
const maudit = load("maudit");
const argot = load("argot");
const crosswords = load("crosswords");

function validateCrossword(p) {
  const grid = new Map();
  for (const clue of p.clues) {
    const letters = [...clue.answer];
    letters.forEach((ch, i) => {
      const row = clue.direction === "down" ? clue.row + i : clue.row;
      const col = clue.direction === "across" ? clue.col + i : clue.col;
      if (row >= p.gridSize || col >= p.gridSize) {
        throw new Error(`${p.id}: "${clue.answer}" déborde de la grille`);
      }
      const key = `${row}-${col}`;
      if (grid.has(key) && grid.get(key) !== ch) {
        throw new Error(
          `${p.id}: conflit en (${row},${col}) — "${grid.get(key)}" vs "${ch}" (${clue.answer})`
        );
      }
      grid.set(key, ch);
    });
  }
}
crosswords.forEach(validateCrossword);

// Un indice de Pyramide ne doit jamais contenir le mot à deviner (accents et
// casse ignorés) : c'est l'erreur la plus facile à commettre en écrivant du contenu.
const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
for (const entry of pyramide) {
  if (!entry.hints || entry.hints.length < 3) {
    throw new Error(`pyramide "${entry.word}" : 3 indices attendus`);
  }
  for (const hint of entry.hints) {
    if (deaccent(hint).includes(deaccent(entry.word))) {
      throw new Error(`pyramide "${entry.word}" : l'indice révèle le mot — "${hint}"`);
    }
  }
}

for (const [name, pool, min] of [
  ["pyramide", pyramide, 10],
  ["taboo", taboo, 10],
  ["maudit", maudit, 10],
  ["argot", argot, 10],
  ["crosswords", crosswords, 1],
]) {
  if (!Array.isArray(pool) || pool.length < min) {
    throw new Error(`pool ${name}: ${pool.length} entrées (< ${min})`);
  }
}

// MARK: - Défis du jour (fenêtre glissante)
//
// On publie WINDOW_DAYS jours d'avance plutôt que le seul jour courant : l'app
// sélectionne l'entrée correspondant à SA date locale. Sans ça, un joueur en
// UTC+2 passé minuit demanderait un jour que le cron (05:00 UTC) n'a pas encore
// publié, et le canal de curation resterait inopérant plusieurs heures par nuit.

const WINDOW_DAYS = 7;

function challengeFor(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const dateKey = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const seed = y * 10000 + m * 100 + d; // YYYYMMDD — même formule côté Swift

  // Difficulté du sudoku façon NYT : facile en début de semaine, dure le week-end
  const weekday = date.getUTCDay(); // 0 = dimanche
  const sudokuDifficulty =
    weekday === 0 || weekday === 6 ? "Difficile" : weekday <= 2 ? "Facile" : "Moyen";

  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const crosswordIndex = rotatingIndex(dayNumber, crosswords.length);

  const rng = mulberry32(seed);
  const argotIndices = pickIndices(rng, 10, argot.length);

  return {
    date: dateKey,
    sudoku: { seed, difficulty: sudokuDifficulty },
    crosswordId: crosswords[crosswordIndex].id,
    argotWords: argotIndices.map((i) => argot[i].word),
  };
}

const dateArg = process.argv[2];
const start = dateArg ? new Date(`${dateArg}T00:00:00Z`) : new Date();
// La veille est incluse : un joueur à l'ouest d'UTC (Amériques) est encore
// "hier" quand le cron tourne.
start.setUTCDate(start.getUTCDate() - 1);

const days = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => {
  const date = new Date(start);
  date.setUTCDate(start.getUTCDate() + i);
  return challengeFor(date);
});

const daily = { schemaVersion: SCHEMA_VERSION, days };

// MARK: - Écriture

mkdirSync(outDir, { recursive: true });

const bundle = { schemaVersion: SCHEMA_VERSION, pyramide, taboo, maudit, argot, crosswords };
writeFileSync(join(outDir, "bundle.json"), JSON.stringify(bundle) + "\n");
writeFileSync(join(outDir, "daily.json"), JSON.stringify(daily, null, 2) + "\n");

console.log(`bundle.json : ${pyramide.length} pyramide, ${taboo.length} taboo, ${maudit.length} maudit, ${argot.length} argot, ${crosswords.length} grilles`);
console.log(`daily.json  : ${days.length} jours, de ${days[0].date} à ${days[days.length - 1].date}`);
for (const day of days) {
  console.log(
    `  ${day.date} — sudoku ${day.sudoku.difficulty} (seed ${day.sudoku.seed}), ` +
      `grille ${day.crosswordId}, argots [${day.argotWords.slice(0, 3).join(", ")}…]`
  );
}
