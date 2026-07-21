// Valide la banque de mots annotés (content/pool/bank.json).
//
// La banque est la source unique dont tous les jeux dérivent. Chaque entrée
// porte au minimum une définition (`clue`, pour les grilles) ; `hints` (Pyramide)
// et `associations` (Taboo) sont facultatifs et s'ajoutent au fil des lots.
//
// Usage : node content/scripts/check-bank.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bank = JSON.parse(readFileSync(join(root, "content", "pool", "bank.json"), "utf8"));
const lexicon = JSON.parse(readFileSync(join(root, "content", "pool", "lexicon.json"), "utf8"));

const known = new Map(lexicon.words.map((w) => [w.word.toLowerCase(), w]));
const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const errors = [];
const warnings = [];
const seen = new Set();

for (const e of bank.entries) {
  const at = `"${e.word}"`;

  // 1. Unicité
  const key = deaccent(e.word);
  if (seen.has(key)) errors.push(`${at} : doublon dans la banque`);
  seen.add(key);

  // 2. Le mot existe-t-il vraiment en français ? (adossé à Lexique)
  const lex = known.get(e.word.toLowerCase());
  if (!lex) {
    warnings.push(`${at} : absent de lexicon.json (nom propre, pluriel ou mot rare ?)`);
  } else if (lex.difficulty !== e.difficulty) {
    // La fréquence d'usage prime sur l'intuition
    warnings.push(`${at} : difficulté "${e.difficulty}" ≠ "${lex.difficulty}" attendue (freq ${lex.freq})`);
  }

  // 3. Forme utilisable en grille
  if (!/^[A-Z]+$/.test(e.grid)) errors.push(`${at} : "grid" doit être en A-Z sans accent`);
  if (deaccent(e.word) !== e.grid.toLowerCase()) {
    errors.push(`${at} : "grid" ne correspond pas au mot (${e.grid})`);
  }
  if (e.grid.length < 3 || e.grid.length > 10) errors.push(`${at} : longueur hors 3–10`);

  // 4. Une définition ne doit jamais contenir la réponse — l'erreur la plus
  //    facile à commettre, et invisible à la relecture rapide.
  const leaks = (text) => deaccent(text).includes(deaccent(e.word));
  if (!e.clue?.trim()) errors.push(`${at} : définition manquante`);
  else if (leaks(e.clue)) errors.push(`${at} : la définition révèle le mot — "${e.clue}"`);

  for (const h of e.hints ?? []) {
    if (leaks(h)) errors.push(`${at} : l'indice révèle le mot — "${h}"`);
  }
  for (const a of e.associations ?? []) {
    if (leaks(a)) errors.push(`${at} : l'association révèle le mot — "${a}"`);
  }

  // 5. Cardinalités attendues quand les champs sont présents
  if (e.hints && e.hints.length !== 3) errors.push(`${at} : 3 indices attendus, ${e.hints.length} fournis`);
  if (e.associations && e.associations.length !== 5) {
    errors.push(`${at} : 5 associations attendues, ${e.associations.length} fournies`);
  }
}

// MARK: - Rapport

const withHints = bank.entries.filter((e) => e.hints).length;
const withAssoc = bank.entries.filter((e) => e.associations).length;
const themes = [...new Set(bank.entries.map((e) => e.theme))];

console.log(`Banque : ${bank.entries.length} entrées, ${themes.length} thèmes`);
console.log(`  définitions (grilles) : ${bank.entries.length}`);
console.log(`  indices (Pyramide)    : ${withHints}`);
console.log(`  associations (Taboo)  : ${withAssoc}`);

for (const t of themes) {
  const n = bank.entries.filter((e) => e.theme === t).length;
  if (n < 8) warnings.push(`thème "${t}" : ${n} mots (< 8, insuffisant pour une grille dédiée)`);
}

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} avertissement(s) :`);
  warnings.slice(0, 15).forEach((w) => console.log(`   ${w}`));
  if (warnings.length > 15) console.log(`   … et ${warnings.length - 15} autres`);
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} erreur(s) :`);
  errors.forEach((e) => console.error(`   ${e}`));
  process.exit(1);
}

console.log("\n✅ Banque valide");
