// Outil d'auteur : construit des grilles de mots fléchés valides à partir
// d'une spec (mots + indices), par backtracking déterministe.
//
//   spec  : content/pool/crosswords.spec.json
//           [{ id, title, difficulty, gridSize, words: [{ answer, clue }] }]
//   sortie: content/pool/crosswords.json (format consommé par l'app)
//
// Garanties : croisements cohérents, mots dans la grille, chaque mot (sauf le
// premier) croise au moins un mot déjà posé. Déterministe : même spec → même
// grille. Usage : node content/scripts/build-crossword.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const poolDir = join(dirname(fileURLToPath(import.meta.url)), "..", "pool");
const specs = JSON.parse(readFileSync(join(poolDir, "crosswords.spec.json"), "utf8"));

function buildPuzzle(spec) {
  const size = spec.gridSize;
  // Plus longs d'abord : meilleur squelette, backtracking plus court.
  const words = [...spec.words].sort((a, b) => b.answer.length - a.answer.length);
  for (const w of words) {
    if (!/^[A-Z]+$/.test(w.answer)) {
      throw new Error(`${spec.id}: "${w.answer}" doit être en A-Z sans accent`);
    }
    if (w.answer.length > size) {
      throw new Error(`${spec.id}: "${w.answer}" est plus long que la grille`);
    }
  }

  const grid = new Map(); // "r-c" -> lettre
  const placements = [];

  const cellsOf = (answer, row, col, dir) =>
    [...answer].map((ch, i) => ({
      ch,
      row: dir === "down" ? row + i : row,
      col: dir === "across" ? col + i : col,
    }));

  function fits(answer, row, col, dir) {
    const cells = cellsOf(answer, row, col, dir);
    let crossings = 0;
    for (const { ch, row: r, col: c } of cells) {
      if (r < 0 || c < 0 || r >= size || c >= size) return -1;
      const existing = grid.get(`${r}-${c}`);
      if (existing !== undefined) {
        if (existing !== ch) return -1;
        crossings++;
      }
    }
    if (crossings === answer.length) return -1; // recouvrement total interdit
    return crossings;
  }

  function put(answer, row, col, dir) {
    const added = [];
    for (const { ch, row: r, col: c } of cellsOf(answer, row, col, dir)) {
      const key = `${r}-${c}`;
      if (!grid.has(key)) {
        grid.set(key, ch);
        added.push(key);
      }
    }
    return added;
  }

  // À chaque étape, essaie chacun des mots restants (l'ordre d'insertion fait
  // partie de la recherche : un mot posé trop tôt peut priver un autre de
  // croisement). Déterministe : itération dans un ordre fixe.
  const used = new Array(words.length).fill(false);

  function solve(placed) {
    if (placed === words.length) return true;
    for (let w = 0; w < words.length; w++) {
      if (used[w]) continue;
      const { answer } = words[w];
      for (const dir of placed % 2 === 0 ? ["across", "down"] : ["down", "across"]) {
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const crossings = fits(answer, row, col, dir);
            if (crossings < 0) continue;
            if (placed > 0 && crossings === 0) continue;
            const added = put(answer, row, col, dir);
            placements.push({ ...words[w], row, col, direction: dir });
            used[w] = true;
            if (solve(placed + 1)) return true;
            used[w] = false;
            placements.pop();
            added.forEach((k) => grid.delete(k));
          }
        }
      }
      // Si le premier mot restant ne se place nulle part, inutile d'essayer
      // les suivants à ce niveau : l'ensemble est déjà insoluble.
      if (placed === 0) break;
    }
    return false;
  }

  if (!solve(0)) {
    throw new Error(`${spec.id}: aucun agencement trouvé — revoir la liste de mots`);
  }

  return {
    id: spec.id,
    title: spec.title,
    difficulty: spec.difficulty,
    gridSize: size,
    clues: placements
      .map((p, i) => ({
        id: i + 1,
        row: p.row,
        col: p.col,
        direction: p.direction,
        answer: p.answer,
        clue: p.clue,
      })),
  };
}

const puzzles = specs.map(buildPuzzle);
writeFileSync(join(poolDir, "crosswords.json"), JSON.stringify(puzzles, null, 2) + "\n");

for (const p of puzzles) {
  console.log(`${p.id} (${p.gridSize}×${p.gridSize}) : ${p.clues.length} mots placés`);
}
