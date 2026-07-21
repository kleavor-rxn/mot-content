// Construit la banque de mots candidats à partir de Lexique 3.
//
// Lexique383 n'est PAS versionné ici (25 Mo). À télécharger une fois :
//   curl -sLO http://www.lexique.org/databases/Lexique383/Lexique383.zip
//   unzip Lexique383.zip
//
// Usage :
//   node content/scripts/import-lexique.mjs chemin/vers/Lexique383.tsv
//
// Sortie : content/pool/lexicon.json — des CANDIDATS, pas du contenu de jeu.
// Les indices restent à rédiger ; ce fichier fournit la matière première et,
// surtout, une difficulté fondée sur la fréquence réelle d'usage plutôt que
// sur une intuition.
//
// Licence : Lexique 3 est publié sous CC BY-SA 4.0 (Boris New & Christophe
// Pallier, lexique.org). Le pool dérivé doit être redistribué sous la même
// licence avec attribution — c'est le cas : `mot-content` est public.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];

if (!source) {
  console.error("Usage : node content/scripts/import-lexique.mjs <Lexique383.tsv>");
  process.exit(1);
}

// MARK: - Bandes de difficulté (occurrences par million, corpus livres + films)

// Le plancher est à 1.0 et non 0.4 : en dessous, on tombe dans un vocabulaire
// que même un bon joueur ne reconnaît pas (saxhorn, targe, édicule…), ce qui
// produit de la frustration plutôt que du défi.
const TIERS = [
  { name: "facile", min: 15 },
  { name: "moyen", min: 2.5 },
  { name: "difficile", min: 1.0 },
];

const MIN_LETTERS = 3;
const MAX_LETTERS = 10;

// Mots à écarter : trop crus, trop cliniques ou trop chargés pour un jeu grand
// public. Liste volontairement courte et explicite — à compléter à la relecture.
const BLOCKLIST = new Set([
  // Violence, maladie, mort
  "viol", "mort", "morte", "cadavre", "suicide", "cancer", "sida", "guerre",
  "nazi", "raciste", "drogue", "arme", "fusil", "meurtre", "torture", "tuerie",
  "massacre", "agonie", "cercueil", "tombe", "pendaison", "otage",
  // Vulgaire — repéré à la relecture de l'échantillon : « Con » ressortait en
  // bande « facile », c'est-à-dire proposé aux débutants.
  "con", "conne", "cul", "bite", "chatte", "salope", "pute", "putain", "merde",
  "couille", "nichon", "enculé", "connard", "bordel", "chier", "pisse", "baise",
  "sexe", "penis", "vagin", "orgasme", "seins", "fesse", "zizi",
  // Stupéfiants
  "hasch", "shit", "coke", "héro", "joint", "beuh",
]);

// Anglicismes et abréviations que Lexique référence mais qui n'ont pas leur
// place dans un jeu de mots français grand public.
const NOT_FRENCH = new Set([
  "past", "song", "smash", "week", "black", "boss", "job", "kid", "cash",
  "deal", "fun", "hit", "look", "night", "star", "team", "top", "week",
]);

const deaccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// MARK: - Lecture

const rows = readFileSync(source, "utf8").split("\n");
const header = rows[0].split("\t");
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

for (const needed of ["ortho", "cgram", "islem", "nombre", "nblettres", "freqlivres", "freqfilms2"]) {
  if (col[needed] === undefined) {
    throw new Error(`colonne "${needed}" absente — format Lexique inattendu`);
  }
}

// Passe préalable : pour chaque graphie, la fréquence maximale atteinte dans
// une catégorie AUTRE que « nom ». Elle sert à écarter les participes
// substantivés (« Agité », « Déplacé ») : ce sont avant tout des adjectifs ou
// des verbes, et ils font des réponses de grille déroutantes.
const freqAilleurs = new Map();
for (let i = 1; i < rows.length; i++) {
  const r = rows[i].split("\t");
  if (r.length < header.length) continue;
  const cgram = r[col.cgram].trim();
  if (cgram === "NOM" || cgram === "") continue;
  const key = r[col.ortho].trim().toLowerCase();
  const f = Math.max(parseFloat(r[col.freqlivres]) || 0, parseFloat(r[col.freqfilms2]) || 0);
  if (f > (freqAilleurs.get(key) ?? 0)) freqAilleurs.set(key, f);
}

const seen = new Map(); // graphie sans accent → entrée retenue
const candidates = [];
const stats = { lus: 0, nonNom: 0, nonLemme: 0, pluriel: 0, longueur: 0, forme: 0, tropRare: 0, blocklist: 0, anglicisme: 0, surtoutVerbeOuAdj: 0, doublon: 0 };

for (let i = 1; i < rows.length; i++) {
  const r = rows[i].split("\t");
  if (r.length < header.length) continue;
  stats.lus++;

  const ortho = r[col.ortho].trim();
  const cgram = r[col.cgram].trim();

  // Noms communs uniquement : les verbes conjugués et les adjectifs accordés
  // font de mauvaises réponses de grille.
  if (cgram !== "NOM") { stats.nonNom++; continue; }
  // Forme de base seulement (évite les pluriels et les variantes fléchies)
  if (r[col.islem].trim() !== "1") { stats.nonLemme++; continue; }
  if (r[col.nombre].trim() === "p") { stats.pluriel++; continue; }

  const letters = parseInt(r[col.nblettres], 10);
  if (!(letters >= MIN_LETTERS && letters <= MAX_LETTERS)) { stats.longueur++; continue; }

  // Un seul mot, lettres uniquement (les traits d'union et apostrophes ne
  // passent pas dans une grille)
  if (!/^[a-zà-öø-ÿœæ]+$/i.test(ortho)) { stats.forme++; continue; }

  const freq = Math.max(
    parseFloat(r[col.freqlivres]) || 0,
    parseFloat(r[col.freqfilms2]) || 0
  );
  const tier = TIERS.find((t) => freq >= t.min);
  if (!tier) { stats.tropRare++; continue; }

  const key = deaccent(ortho).toLowerCase();
  if (BLOCKLIST.has(key)) { stats.blocklist++; continue; }
  if (NOT_FRENCH.has(key)) { stats.anglicisme++; continue; }

  // Le mot est-il d'abord autre chose qu'un nom ?
  if ((freqAilleurs.get(ortho.toLowerCase()) ?? 0) > freq) {
    stats.surtoutVerbeOuAdj++;
    continue;
  }

  // Deux mots qui ne diffèrent que par un accent partagent la même grille
  // (FORET) : il faut n'en garder qu'un. On garde le PLUS FRÉQUENT, sans quoi
  // le premier venu l'emporte — « foret » (la mèche, 1.16) évinçait « forêt »
  // (91.89), et « cote » évinçait « côte ».
  const déjà = seen.get(key);
  if (déjà) {
    stats.doublon++;
    if (freq <= déjà.freq) continue;
    const at = candidates.indexOf(déjà);
    if (at >= 0) candidates.splice(at, 1); // jamais splice(-1) : il retirerait le dernier
  }

  const entry = {
    word: ortho.charAt(0).toUpperCase() + ortho.slice(1),
    // Forme majuscule sans accent : ce qui entre réellement dans une grille
    grid: deaccent(ortho).toUpperCase(),
    letters,
    freq: Math.round(freq * 100) / 100,
    difficulty: tier.name,
  };
  seen.set(key, entry);
  candidates.push(entry);
}

// Les plus fréquents d'abord : la relecture commence par les mots les plus utiles
candidates.sort((a, b) => b.freq - a.freq);

writeFileSync(
  join(root, "content", "pool", "lexicon.json"),
  JSON.stringify(
    {
      source: "Lexique 3.83 — lexique.org (Boris New & Christophe Pallier)",
      license: "CC BY-SA 4.0",
      generated: "content/scripts/import-lexique.mjs",
      count: candidates.length,
      words: candidates,
    },
    null,
    2
  ) + "\n"
);

// MARK: - Rapport

console.log(`Lignes lues : ${stats.lus}`);
console.log("Écartés :");
for (const [k, v] of Object.entries(stats)) {
  if (k !== "lus" && v > 0) console.log(`  ${k.padEnd(12)} ${v}`);
}
console.log(`\nRetenus : ${candidates.length} mots`);
for (const t of TIERS) {
  const n = candidates.filter((c) => c.difficulty === t.name).length;
  console.log(`  ${t.name.padEnd(10)} ${String(n).padStart(5)}  (freq ≥ ${t.min})`);
}
