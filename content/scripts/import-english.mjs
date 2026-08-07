// Construit la banque de mots candidats ANGLAIS — l'équivalent de
// import-lexique.mjs, qui fait la même chose pour le français depuis Lexique 3.
//
// L'anglais n'a pas de Lexique : aucune base unique ne réunit orthographe,
// catégorie grammaticale et fréquence sous une licence commerciale claire. On
// croise donc trois sources, chacune choisie pour ce qu'elle apporte ET pour sa
// licence :
//
//   1. SCOWL / ESDB (app.aspell.net)  — l'ORTHOGRAPHE. Ce qui n'y est pas n'est
//      pas un mot anglais. Licence permissive type BSD (Kevin Atkinson),
//      redistribution et usage commercial autorisés avec mention.
//   2. WordNet 3.1 (Princeton)        — la CATÉGORIE. index.noun donne les noms
//      communs, et surtout cntlist.rev donne les occurrences PAR CATÉGORIE
//      (corpus SemCor étiqueté à la main). Licence WordNet, permissive.
//   3. OpenSubtitles 2018 en_50k      — la FRÉQUENCE, donc la difficulté
//      OBJECTIVE. Même nature que le freqfilms de Lexique : des sous-titres,
//      c'est-à-dire de la langue parlée. CC BY-SA 4.0 (OPUS / hermitdave).
//
// La catégorie est le point dur, et il a fallu deux passes. Filtrer sur la
// seule présence dans index.noun laissait remonter « have », « know »,
// « think » en tête de liste : WordNet leur connaît un sens nominal, et la
// fréquence des sous-titres ne distingue pas les catégories. C'est exactement
// ce que la fréquence par catégorie de Lexique évite côté français.
// cntlist.rev rétablit ce signal : « know » est étiqueté 954 fois verbe et 0
// fois nom, « water » 182 fois nom contre 7 fois verbe. On ne garde que les
// mots à dominante nominale, et la fréquence retenue est celle du SENS NOMINAL
// (fréquence brute × part nominale), pas celle de toutes les catégories
// confondues — sans quoi « watch », inflé par son emploi verbal, passerait pour
// un mot facile.
//
// Conséquence licence, identique au français : le pool dérivé est partagé à
// l'identique, et `mot-content` est public — l'obligation est déjà satisfaite.
// Attribution à ajouter dans l'écran « À propos » au même titre que Lexique.
//
// Les trois sources ne sont PAS versionnées (17 Mo). À télécharger une fois :
//
//   curl -sSL -o en_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt
//   curl -sSL -o scowl-60.txt "http://app.aspell.net/create?max_size=60&spelling=US&max_variant=1&diacritic=strip&download=wordlist&encoding=utf-8&format=inline"
//   curl -sSL -o wn31.tar.gz https://wordnetcode.princeton.edu/wn3.1.dict.tar.gz && tar xzf wn31.tar.gz dict/
//
// Usage :
//   node content/scripts/import-english.mjs <scowl.txt> <dict/> <en_50k.txt>
//
// Sorties :
//   content/pool/en/lexicon.json         — CANDIDATS annotés (mot, freq, difficulté)
//   content/pool/en/wordle-accepted.json — essais acceptés par Mot Caché (5 lettres)
//
// Ce sont des candidats, pas du contenu de jeu : les indices restent à écrire
// dans bank.json. Ce fichier fournit la matière première et, surtout, une
// difficulté fondée sur l'usage réel plutôt que sur une intuition.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { root } from "./lib/locale.mjs";

const [scowlPath, dictDir, freqPath] = process.argv.slice(2);

if (!scowlPath || !dictDir || !freqPath) {
  console.error("Usage : node content/scripts/import-english.mjs <scowl.txt> <dict/> <en_50k.txt>");
  process.exit(1);
}

const outDir = join(root, "content", "pool", "en");

// MARK: - Bandes de difficulté (occurrences par million)
//
// Mêmes seuils que le français : les deux corpus sont des sous-titres, donc
// des fréquences comparables. Le plancher à 1.0 écarte le vocabulaire que même
// un bon joueur ne reconnaît pas — il frustre au lieu de défier.
const TIERS = [
  { name: "facile", min: 15 },
  { name: "moyen", min: 2.5 },
  { name: "difficile", min: 1.0 },
];

const MIN_LETTERS = 3;
const MAX_LETTERS = 10;

// Trop crus, trop cliniques ou trop chargés pour un jeu grand public. Mêmes
// catégories que la liste française : violence, mort, maladie, drogue,
// vulgarité. Volontairement explicite — à compléter à la relecture.
const BLOCKLIST = new Set([
  // Violence, mort, maladie
  "rape", "murder", "corpse", "suicide", "cancer", "aids", "war", "nazi",
  "racist", "drug", "gun", "rifle", "torture", "massacre", "agony", "coffin",
  "grave", "tomb", "hostage", "death", "killer", "killing", "victim", "weapon",
  "bomb", "blood", "wound", "tumor", "disease", "plague", "hell", "devil",
  "slave", "prison", "gallows", "hanging", "stabbing", "shooting", "abuse",
  // Vulgarité et sexe
  "ass", "arse", "bitch", "bastard", "crap", "cock", "dick", "prick", "shit",
  "piss", "fuck", "cunt", "whore", "slut", "hooker", "pimp", "boob", "tit",
  "nipple", "penis", "vagina", "orgasm", "porn", "sex", "butt", "fart", "turd",
  "damn", "bloody", "sucker", "screw",
  // Stupéfiants, alcool dur
  // « needle » n'y est PAS : c'est d'abord une aiguille à coudre, et le sens
  // seringue est déjà couvert par « syringe ».
  "cocaine", "heroin", "meth", "weed", "dope", "junkie", "booze", "crack",
  "pill", "syringe",
  // Religion et politique : hors périmètre d'un jeu grand public international
  "jesus", "christ", "god", "allah", "church", "priest", "prayer", "sin",
  // Repérés à la relecture du premier tirage — le même exercice que « Con » en
  // bande facile côté français : seul l'échantillon les fait apparaître.
  "cum", "pee", "poop", "puke", "vomit", "bullshit", "moron", "idiot", "jerk",
  "freak", "creep", "punk", "thug", "gangster", "mafia", "casino", "gamble",
  "pussy", "sperm", "semen", "urine", "fanny", "porno", "filth", "booty",
  "fatso", "bosom", "thigh", "swine", "bribe", "brothel", "stripper",
  // Injures raciales — inacceptables, quelle que soit la fréquence
  "negro", "gypsy", "mammy", "savage", "redskin", "chink",
  // Alcool, tabac, jeux d'argent
  "vodka", "booze", "whisky", "whiskey", "cigar", "cigarette", "wager", "poker",
  "opium", "arson", "havoc", "wrath",
  // Religion : hors périmètre, au même titre que la liste française
  "bible", "rabbi", "padre", "vicar", "nun", "monk", "pope", "mosque",
  "reverend", "archbishop", "sermon", "gospel", "messiah", "satan",
]);

// Mots grammaticaux auxquels WordNet connaît un sens nominal — « are » est une
// unité de surface, « will » un testament, « who » une organisation. Leur
// fréquence vient de l'emploi grammatical, jamais du nom : ils remontaient en
// tête de liste. Un jeu de mots ne les utilise pas.
const FUNCTION_WORDS = new Set([
  "are", "who", "whom", "whose", "yes", "yeah", "yep", "nope", "not", "will",
  "may", "can", "shall", "must", "would", "could", "should", "might", "ought",
  "hello", "hi", "hey", "bye", "thanks", "please", "sorry", "okay", "ok",
  "someone", "something", "anything", "nothing", "everything", "somebody",
  "anybody", "everybody", "nobody", "anyone", "everyone", "none", "both",
  "sir", "madam", "mister", "miss", "mrs", "mr", "ms", "aye", "nay", "amen",
  "ah", "oh", "eh", "um", "uh", "wow", "ouch", "oops", "huh", "hmm",
  "why", "how", "what", "when", "where", "there", "here", "now", "then",
]);

// Artefacts de tokenisation du corpus de sous-titres : « don't » y est découpé
// en « don » + « t », ce qui donne à « don » (le titre universitaire, un vrai
// nom de WordNet) une fréquence de 5 700 par million — devant « time ».
const TOKENIZATION_ARTIFACTS = new Set([
  "don", "won", "ll", "ve", "re", "em", "ya", "ain", "gonna", "wanna", "gotta",
  "kinda", "sorta", "outta", "lemme", "gimme",
]);

// MARK: - Lecture de WordNet
//
// index.<pos> : « lemme pos nb_synsets … », précédé de 29 lignes de licence
// commençant par un espace. Les lemmes composés portent un souligné
// (« ice_cream ») : hors sujet pour une grille.
// La 3e colonne est le nombre de sens (synsets) du lemme dans cette catégorie :
// une mesure de polysémie qui sert de repli quand le corpus étiqueté est muet.
function readIndex(file) {
  const senses = new Map();
  for (const line of readFileSync(join(dictDir, file), "utf8").split("\n")) {
    if (!line || line.startsWith(" ")) continue;
    const [lemma, , count] = line.split(" ");
    if (/^[a-z]+$/.test(lemma)) senses.set(lemma, Number(count) || 0);
  }
  return senses;
}

const nounSenses = readIndex("index.noun");
const verbSenses = readIndex("index.verb");
const adjSenses = readIndex("index.adj");

const nouns = new Set(nounSenses.keys());
const verbs = new Set(verbSenses.keys());

// cntlist.rev : « clé_de_sens numéro occurrences ». La clé encode la catégorie
// (1 nom, 2 verbe, 3 et 5 adjectif, 4 adverbe). En sommant par lemme on obtient
// la répartition d'usage réelle, mesurée sur un corpus étiqueté à la main.
const tagged = new Map();
for (const line of readFileSync(join(dictDir, "cntlist.rev"), "utf8").split("\n")) {
  const [key, , count] = line.trim().split(/\s+/);
  const match = key?.match(/^([^%]+)%(\d)/);
  if (!match) continue;
  const [, lemma, pos] = match;
  if (!/^[a-z]+$/.test(lemma)) continue;
  const bucket = tagged.get(lemma) ?? { noun: 0, other: 0 };
  if (pos === "1") bucket.noun += Number(count) || 0;
  else bucket.other += Number(count) || 0;
  tagged.set(lemma, bucket);
}

// Part du sens nominal dans les emplois étiquetés. `null` quand le mot n'est
// pas couvert par SemCor (2 mots sur 7 environ) : on retombe alors sur une
// règle structurelle — un mot qui n'est ni verbe ni adjectif dans WordNet est
// un nom sans ambiguïté.
// SemCor ne compte que 200 000 mots étiquetés : sous un certain nombre de
// relevés, la répartition est du bruit. « pepper » y apparaît 2 fois, les deux
// comme verbe — en conclure que ce n'est pas un nom serait absurde. En dessous
// du seuil, on retombe donc sur la polysémie.
const MIN_TAGGED_SAMPLE = 8;

function nounShare(word) {
  const t = tagged.get(word);
  if (!t || t.noun + t.other < MIN_TAGGED_SAMPLE) return null;
  return t.noun / (t.noun + t.other);
}

// 0.35 et non 0.5 : l'anglais verbalise ses noms sans effort (« to anchor »,
// « to brush »), et un tiers d'emplois nominaux suffit à faire un bon mot de
// grille. En dessous, on tombe sur des verbes à sens nominal marginal.
const MIN_NOUN_SHARE = 0.35;

// Gérondifs substantivés (« running ») : mauvais mots de jeu. Écartés seulement
// si la base est un verbe connu — « king », « ring », « string » restent.
function isGerund(word) {
  if (!word.endsWith("ing") || word.length < 5) return false;
  const stem = word.slice(0, -3);
  return (
    verbs.has(stem) || // walk → walking
    verbs.has(stem + "e") || // dance → dancing
    (stem.length > 2 && stem.at(-1) === stem.at(-2) && verbs.has(stem.slice(0, -1))) // run → running
  );
}

// Pluriels : WordNet indexe « marbles », « provisions », « chips » comme lemmes
// à part entière. Le français filtrait sur la colonne `nombre` de Lexique ;
// faute d'équivalent, on écarte les formes dont le singulier est lui-même un nom.
function isPlural(word) {
  if (!word.endsWith("s") || word.length < 4) return false;
  return nouns.has(word.slice(0, -1)) || (word.endsWith("es") && nouns.has(word.slice(0, -2)));
}

// Formes fléchies irrégulières : WordNet les liste comme lemmes nominaux alors
// que ce sont des conjugaisons (« shook », « stole », « spoke », « drove ») ou
// des pluriels (« teeth », « elves »). Les fichiers d'exception de WordNet les
// recensent exactement — inutile de deviner.
//
//   verb.exc : « shook shake »   noun.exc : « teeth tooth »
function readExceptions(file) {
  const set = new Set();
  for (const line of readFileSync(join(dictDir, file), "utf8").split("\n")) {
    const inflected = line.trim().split(" ")[0];
    if (/^[a-z]+$/.test(inflected)) set.add(inflected);
  }
  return set;
}

const inflected = new Set([...readExceptions("verb.exc"), ...readExceptions("noun.exc")]);

// Prénoms : « Peter », « Molly », « Billy » sortaient du lexique parce que
// WordNet leur connaît un sens commun (souvent argotique) et que les sous-titres
// les emploient sans cesse. macOS livre une liste de prénoms sous
// /usr/share/dict/propernames ; à défaut, seule la liste ci-dessous s'applique.
const CURATED_NAMES = new Set([
  "peter", "billy", "bobby", "molly", "sally", "terry", "holly", "sonny",
  "romeo", "homer", "drake", "marge", "dolly", "wally", "hogan", "patty",
  "paddy", "mason", "lance", "smith", "jenny", "maria", "kitty", "teddy",
  "randy", "jack", "mark", "bill", "rose", "grace", "frank", "victor",
]);

const properNames = new Set(CURATED_NAMES);
try {
  for (const line of readFileSync("/usr/share/dict/propernames", "utf8").split("\n")) {
    const name = line.trim().toLowerCase();
    if (/^[a-z]+$/.test(name)) properNames.add(name);
  }
} catch {
  console.warn("⚠ /usr/share/dict/propernames absent — seuls les prénoms de la liste interne sont écartés");
}

// MARK: - 1. Orthographe : ce que SCOWL reconnaît
//
// L'export app.aspell.net commence par un en-tête de quelques lignes en prose,
// suivi d'un mot par ligne. On ne garde que les formes en minuscules : une
// capitale signale un nom propre, qui n'a pas sa place dans une grille.

const scowl = new Set();
const scowlAll = new Set(); // capitales comprises, pour le diagnostic
for (const raw of readFileSync(scowlPath, "utf8").split("\n")) {
  const word = raw.trim();
  if (!word || word.includes(" ")) continue;
  scowlAll.add(word);
  if (/^[a-z]+$/.test(word)) scowl.add(word);
}

// MARK: - 2. Fréquence : OpenSubtitles
//
// Format : « mot occurrences », du plus fréquent au plus rare. On convertit en
// occurrences par million pour que les seuils soient comparables au français.

const counts = new Map();
let total = 0;
for (const line of readFileSync(freqPath, "utf8").split("\n")) {
  const [word, n] = line.trim().split(" ");
  if (!word || !n) continue;
  const count = Number(n);
  total += count;
  if (/^[a-z]+$/.test(word)) counts.set(word, count);
}
const perMillion = (word) => ((counts.get(word) ?? 0) / total) * 1e6;

// MARK: - Croisement

const rejected = {
  pos: 0, verbSense: 0, spelling: 0, length: 0, rare: 0,
  blocked: 0, gerund: 0, plural: 0, artifact: 0, inflected: 0, name: 0,
};
const words = [];

for (const [word] of counts) {
  if (word.length < MIN_LETTERS || word.length > MAX_LETTERS) { rejected.length++; continue; }
  if (TOKENIZATION_ARTIFACTS.has(word) || FUNCTION_WORDS.has(word)) { rejected.artifact++; continue; }
  if (!scowl.has(word)) { rejected.spelling++; continue; }
  if (!nouns.has(word)) { rejected.pos++; continue; }
  if (BLOCKLIST.has(word)) { rejected.blocked++; continue; }
  if (isGerund(word)) { rejected.gerund++; continue; }
  if (isPlural(word)) { rejected.plural++; continue; }
  if (inflected.has(word)) { rejected.inflected++; continue; }

  // Dominante nominale : mesurée quand SemCor couvre le mot (2 sur 3), déduite
  // de la polysémie sinon. Refuser tout mot ayant un sens verbal écartait
  // « turtle », « anchor », « needle », « pilot » — des noms que l'anglais
  // verbalise volontiers. Comparer le NOMBRE de sens par catégorie les garde,
  // et écarte quand même « cling » ou « sneeze », verbes à sens nominal marginal.
  const share = nounShare(word);
  if (share === null) {
    const asNoun = nounSenses.get(word) ?? 0;
    if (asNoun < (verbSenses.get(word) ?? 0) || asNoun < (adjSenses.get(word) ?? 0)) {
      rejected.verbSense++;
      continue;
    }
    // Le filtre prénoms ne s'applique QUE là : la liste de macOS contient
    // « Pilot » et « Robin », qui sont d'abord des noms communs. Un mot attesté
    // comme nom dans SemCor n'est pas un prénom, quoi qu'en dise la liste.
    if (properNames.has(word)) { rejected.name++; continue; }
  } else if (share < MIN_NOUN_SHARE) {
    rejected.verbSense++;
    continue;
  }

  // La fréquence retenue est celle du SENS NOMINAL : la fréquence brute compte
  // aussi les emplois verbaux, qui ne disent rien de la difficulté du mot dans
  // une grille.
  const freqAll = perMillion(word);
  const freq = freqAll * (share ?? 1);
  const tier = TIERS.find((t) => freq >= t.min);
  if (!tier) { rejected.rare++; continue; }

  words.push({
    word: word[0].toUpperCase() + word.slice(1),
    grid: word.toUpperCase(),
    letters: word.length,
    freq: Math.round(freq * 100) / 100,
    difficulty: tier.name,
    ...(share === null ? {} : { freqAll: Math.round(freqAll * 100) / 100 }),
  });
}

words.sort((a, b) => b.freq - a.freq);

mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, "lexicon.json"),
  JSON.stringify(
    {
      source:
        "SCOWL/ESDB (app.aspell.net) · WordNet 3.1 (Princeton) · OpenSubtitles 2018 (OPUS, via hermitdave/FrequencyWords)",
      license: "CC BY-SA 4.0 (fréquences OpenSubtitles) — voir en-tête de import-english.mjs",
      generated: "content/scripts/import-english.mjs",
      count: words.length,
      words,
    },
    null,
    2
  ) + "\n"
);

// MARK: - Dictionnaire d'acceptation de Mot Caché
//
// TOUTES les formes de 5 lettres reconnues par SCOWL — verbes conjugués,
// pluriels, adjectifs — pas seulement les noms. Sans ça, un joueur qui tente
// LOVED ou GREEN se voit répondre « unknown word », et la confiance tombe.
// Aucun plancher de fréquence, aucune blocklist : c'est le joueur qui tape.

const accepted = [...scowl]
  .filter((w) => w.length === 5)
  .map((w) => w.toUpperCase())
  .sort();

writeFileSync(
  join(outDir, "wordle-accepted.json"),
  JSON.stringify(
    {
      source: "SCOWL/ESDB (app.aspell.net), size 60, US, variant common",
      license: "Permissive (Kevin Atkinson) — voir en-tête de import-english.mjs",
      generated: "content/scripts/import-english.mjs",
      count: accepted.length,
      grids: accepted,
    },
    null,
    2
  ) + "\n"
);

// MARK: - Rapport

const byTier = (name) => words.filter((w) => w.difficulty === name).length;
const gridable = words.filter((w) => w.letters >= 3 && w.letters <= 8).length;

console.log(`Sources : ${scowlAll.size} formes SCOWL, ${nouns.size} noms WordNet, ${counts.size} mots comptés`);
console.log(`Lexique anglais : ${words.length} noms communs`);
console.log(`  facile    ${byTier("facile")}`);
console.log(`  moyen     ${byTier("moyen")}`);
console.log(`  difficile ${byTier("difficile")}`);
console.log(`  utilisables en grille (3–8 lettres) : ${gridable}`);
console.log(
  `Écartés : ${rejected.pos} hors catégorie, ${rejected.verbSense} à dominante verbale/adjectivale, ` +
    `${rejected.spelling} hors dictionnaire, ${rejected.length} trop courts/longs, ` +
    `${rejected.rare} trop rares, ${rejected.plural} pluriels, ${rejected.gerund} gérondifs, ` +
    `${rejected.inflected} formes fléchies, ${rejected.name} prénoms, ` +
    `${rejected.blocked} liste noire, ${rejected.artifact} mots grammaticaux`
);
console.log(`Mot Caché : ${accepted.length} essais acceptés de 5 lettres`);
