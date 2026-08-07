// Dérive les pools Pyramide et Taboo depuis la banque annotée.
//
// Les pools écrits à la main (pyramide.json, taboo.json) sont CONSERVÉS : la
// banque vient les compléter, elle ne les remplace pas. C'est ce qui permet
// d'enrichir progressivement sans rien perdre.
//
//   bank.entries[].hints         → pyramide.json (mot + 3 indices)
//   bank.entries[].associations  → taboo.json    (mot + 5 mots associés)
//
// Usage : node content/scripts/derive-pools.mjs [--locale=fr|en]

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveLocale } from "./lib/locale.mjs";

const { poolDir } = resolveLocale();
const read = (f) => JSON.parse(readFileSync(join(poolDir, f), "utf8"));

// Une langue neuve n'a aucun pool écrit à la main : tout vient de la banque.
const readOrEmpty = (f) => (existsSync(join(poolDir, f)) ? read(f) : []);
const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const bank = read("bank.json");
const pyramide = readOrEmpty("pyramide.json");
const taboo = readOrEmpty("taboo.json");

// MARK: - Pyramide

const pyramideSeen = new Set(pyramide.map((e) => deaccent(e.word)));
let addedPyramide = 0;
for (const e of bank.entries) {
  if (!e.hints || e.hints.length !== 3) continue;
  if (pyramideSeen.has(deaccent(e.word))) continue;
  pyramide.push({ word: e.word, hints: e.hints });
  pyramideSeen.add(deaccent(e.word));
  addedPyramide++;
}

// MARK: - Taboo
//
// Les mots interdits sont les associations : en groupe on ne doit pas les
// prononcer, en solo ils servent d'indices. Même donnée, deux usages.

const tabooSeen = new Set(taboo.map((e) => deaccent(e.word)));
let addedTaboo = 0;
for (const e of bank.entries) {
  if (!e.associations || e.associations.length !== 5) continue;
  if (tabooSeen.has(deaccent(e.word))) continue;
  taboo.push({ word: e.word, forbidden: e.associations });
  tabooSeen.add(deaccent(e.word));
  addedTaboo++;
}

writeFileSync(join(poolDir, "pyramide.json"), JSON.stringify(pyramide, null, 2) + "\n");
writeFileSync(join(poolDir, "taboo.json"), JSON.stringify(taboo, null, 2) + "\n");

console.log(`Pyramide : +${addedPyramide} → ${pyramide.length} mots`);
console.log(`Taboo    : +${addedTaboo} → ${taboo.length} mots`);
