// Placement de mots croisés par backtracking piloté par les croisements.
//
// Partagé par build-crossword.mjs (grilles écrites à la main) et
// generate-grids.mjs (grilles dérivées de la banque). Déterministe : même
// entrée → même grille.
//
// RÈGLE DE VALIDITÉ (mots fléchés corrects) : deux mots ne peuvent se toucher
// qu'à un vrai croisement. Un mot est délimité par des cases vides — sinon,
// deux mots collés bout-à-bout ou côte-à-côte fusionnent visuellement en une
// suite de lettres sans case noire pour marquer la fin. C'est le défaut qui
// avait été signalé sur une grille du jour. On l'interdit ici à la source.

/**
 * Place les mots donnés dans une grille carrée.
 * @param {{answer: string, clue: string}[]} words
 * @param {number} size
 * @returns {{row, col, direction, answer, clue}[] | null} null si insoluble
 */
export function placeWords(words, size) {
  const ordered = [...words].sort((a, b) => b.answer.length - a.answer.length);
  for (const w of ordered) {
    if (!/^[A-Z]+$/.test(w.answer)) {
      throw new Error(`"${w.answer}" doit être en A-Z sans accent`);
    }
    if (w.answer.length > size) {
      throw new Error(`"${w.answer}" est plus long que la grille (${size})`);
    }
  }

  const grid = new Map();          // "r-c" → lettre
  const placements = [];
  const has = (r, c) => grid.has(`${r}-${c}`);

  const cellsOf = (answer, row, col, dir) =>
    [...answer].map((ch, i) => ({
      ch,
      row: dir === "down" ? row + i : row,
      col: dir === "across" ? col + i : col,
    }));

  // Nombre de croisements si on posait le mot ici ; -1 si le placement viole
  // une règle (hors grille, conflit de lettre, ou adjacence interdite).
  function fits(answer, row, col, dir) {
    // Cases juste avant le début et juste après la fin (sens du mot) : vides.
    const before = dir === "down" ? { r: row - 1, c: col } : { r: row, c: col - 1 };
    const after =
      dir === "down"
        ? { r: row + answer.length, c: col }
        : { r: row, c: col + answer.length };
    if (has(before.r, before.c)) return -1;
    if (has(after.r, after.c)) return -1;

    let crossings = 0;
    for (const { ch, row: r, col: c } of cellsOf(answer, row, col, dir)) {
      if (r < 0 || c < 0 || r >= size || c >= size) return -1;
      const existing = grid.get(`${r}-${c}`);
      if (existing !== undefined) {
        if (existing !== ch) return -1;
        crossings++; // croisement légitime avec un mot perpendiculaire
      } else {
        // Case neuve : pas de case pleine sur les côtés perpendiculaires,
        // sinon mot parallèle fantôme.
        const sideA = dir === "across" ? { r: r - 1, c } : { r, c: c - 1 };
        const sideB = dir === "across" ? { r: r + 1, c } : { r, c: c + 1 };
        if (has(sideA.r, sideA.c) || has(sideB.r, sideB.c)) return -1;
      }
    }
    if (crossings === answer.length) return -1; // recouvrement total
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

  // Placements candidats d'un mot : uniquement ceux qui CROISENT une lettre
  // déjà posée (une des lettres du mot s'aligne sur une case existante). C'est
  // ce qui rend la recherche rapide — on n'essaie pas toutes les cases.
  function candidatePlacements(answer) {
    const letters = [...answer];
    const seen = new Set();
    const out = [];
    for (const [key, ch] of grid) {
      const [r, c] = key.split("-").map(Number);
      for (let i = 0; i < letters.length; i++) {
        if (letters[i] !== ch) continue;
        for (const cand of [
          { row: r, col: c - i, dir: "across" },
          { row: r - i, col: c, dir: "down" },
        ]) {
          const k = `${cand.row}-${cand.col}-${cand.dir}`;
          if (seen.has(k)) continue;
          seen.add(k);
          if (fits(answer, cand.row, cand.col, cand.dir) > 0) out.push(cand);
        }
      }
    }
    return out;
  }

  // Les mots sont posés dans l'ordre (plus longs d'abord). Chacun doit croiser
  // l'existant. Si l'un ne se pose nulle part, on remonte poser le précédent
  // autrement. La graine du tirage varie l'ensemble de mots (côté appelant),
  // pas cet ordre.
  function solve(k) {
    if (k === ordered.length) return true;
    for (const cand of candidatePlacements(ordered[k].answer)) {
      const added = put(ordered[k].answer, cand.row, cand.col, cand.dir);
      placements.push({ ...ordered[k], row: cand.row, col: cand.col, direction: cand.dir });
      if (solve(k + 1)) return true;
      placements.pop();
      added.forEach((key) => grid.delete(key));
    }
    return false;
  }

  // Premier mot (le plus long) posé à l'horizontale, centré.
  const first = ordered[0];
  const r0 = Math.floor(size / 2);
  const c0 = Math.floor((size - first.answer.length) / 2);
  put(first.answer, r0, c0, "across");
  placements.push({ ...first, row: r0, col: c0, direction: "across" });

  return solve(1) ? placements : null;
}

/** Met les placements au format consommé par l'app. */
export function toPuzzle({ id, title, difficulty, gridSize, placements }) {
  return {
    id,
    title,
    difficulty,
    gridSize,
    clues: placements.map((p, i) => ({
      id: i + 1,
      row: p.row,
      col: p.col,
      direction: p.direction,
      answer: p.answer,
      clue: p.clue,
    })),
  };
}

/** PRNG déterministe — même graine, même sélection de mots. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return (t ^ (t >>> 14)) >>> 0;
  };
}
