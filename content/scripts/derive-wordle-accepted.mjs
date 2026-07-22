// Dictionnaire d'acceptation de Mot Caché : TOUTES les formes de 5 lettres
// de Lexique 3 (verbes conjugués, adjectifs accordés, pluriels…), pas
// seulement les noms. Sans lui, un joueur qui tente AIMER ou VERTE se voit
// répondre « Mot inconnu » — le lexique de jeu (lexicon.json) est trop
// étroit pour valider des essais.
//
// Lexique383 n'est PAS versionné ici (25 Mo). À télécharger une fois :
//   curl -sLO http://www.lexique.org/databases/Lexique383/Lexique383.zip
//   unzip Lexique383.zip
//
// Usage :
//   node content/scripts/derive-wordle-accepted.mjs chemin/vers/Lexique383.tsv
//
// Sortie : content/pool/wordle-accepted.json — versionné, pour que
// generate.mjs n'ait jamais besoin du TSV.
//
// Licence : Lexique 3 est publié sous CC BY-SA 4.0 (Boris New & Christophe
// Pallier, lexique.org), même attribution que lexicon.json.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];

if (!source) {
  console.error("Usage : node content/scripts/derive-wordle-accepted.mjs <Lexique383.tsv>");
  process.exit(1);
}

const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

const rows = readFileSync(source, "utf8").split("\n");
const header = rows[0].split("\t");
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
for (const needed of ["ortho"]) {
  if (col[needed] === undefined) {
    throw new Error(`colonne "${needed}" absente — format Lexique inattendu`);
  }
}

// Aucun plancher de fréquence : accepter un mot rare mais réel (GITES, 0.68)
// n'a aucun coût, le refuser casse la confiance dans le jeu. Pas de blocklist
// non plus : c'est le joueur qui tape le mot, pas le jeu qui le propose.
const grids = new Set();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i].split("\t");
  if (r.length < header.length) continue;
  const ortho = r[col.ortho].trim();
  if (!/^[a-zà-öø-ÿœæ]+$/i.test(ortho)) continue;
  const grid = deaccent(ortho).toUpperCase();
  if (/^[A-Z]{5}$/.test(grid)) grids.add(grid);
}

const sorted = [...grids].sort();
writeFileSync(
  join(root, "content", "pool", "wordle-accepted.json"),
  JSON.stringify(
    {
      source: "Lexique 3.83 — lexique.org (Boris New & Christophe Pallier)",
      license: "CC BY-SA 4.0",
      generated: "content/scripts/derive-wordle-accepted.mjs",
      count: sorted.length,
      grids: sorted,
    },
    null,
    2
  ) + "\n"
);
console.log(`wordle-accepted.json : ${sorted.length} formes de 5 lettres`);
