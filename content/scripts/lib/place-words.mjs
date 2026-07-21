// Placement de mots en grille par backtracking.
//
// Partagé par build-crossword.mjs (grilles écrites à la main) et
// generate-grids.mjs (grilles dérivées de la banque). Déterministe : même
// entrée → même grille.

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

  const grid = new Map();
  const placements = [];
  const used = new Array(ordered.length).fill(false);

  const cellsOf = (answer, row, col, dir) =>
    [...answer].map((ch, i) => ({
      ch,
      row: dir === "down" ? row + i : row,
      col: dir === "across" ? col + i : col,
    }));

  function fits(answer, row, col, dir) {
    let crossings = 0;
    for (const { ch, row: r, col: c } of cellsOf(answer, row, col, dir)) {
      if (r < 0 || c < 0 || r >= size || c >= size) return -1;
      const existing = grid.get(`${r}-${c}`);
      if (existing !== undefined) {
        if (existing !== ch) return -1;
        crossings++;
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

  // L'ordre d'insertion fait partie de la recherche : un mot posé trop tôt peut
  // priver un autre de tout croisement.
  function solve(placed) {
    if (placed === ordered.length) return true;
    for (let w = 0; w < ordered.length; w++) {
      if (used[w]) continue;
      const { answer } = ordered[w];
      for (const dir of placed % 2 === 0 ? ["across", "down"] : ["down", "across"]) {
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const crossings = fits(answer, row, col, dir);
            if (crossings < 0) continue;
            if (placed > 0 && crossings === 0) continue; // doit croiser l'existant
            const added = put(answer, row, col, dir);
            placements.push({ ...ordered[w], row, col, direction: dir });
            used[w] = true;
            if (solve(placed + 1)) return true;
            used[w] = false;
            placements.pop();
            added.forEach((k) => grid.delete(k));
          }
        }
      }
      // Si le premier mot restant ne se place nulle part, l'ensemble est
      // insoluble : inutile d'essayer les suivants à ce niveau.
      if (placed === 0) break;
    }
    return false;
  }

  return solve(0) ? placements : null;
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
