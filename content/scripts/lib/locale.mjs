// Résolution des chemins par langue.
//
// Le français est la langue d'origine et ses chemins NE BOUGENT PAS :
// content/pool, public/, Mot/Resources/GameData.json. Une app déjà installée
// interroge https://…/mot-content/bundle.json — déplacer ce fichier couperait
// le contenu distant de toutes les v1.
//
// Toute autre langue est un sous-dossier de même schéma :
//
//   content/pool/en/*.json  →  public/en/{bundle,daily}.json
//                           →  Mot/Resources/GameData-en.json
//
// Les noms de fichiers sont IDENTIQUES d'une langue à l'autre (argot.json
// contient du slang anglais, pas de l'argot français) : les scripts restent
// ainsi agnostiques, et seul le contenu change.
//
// Usage dans un script :
//   import { resolveLocale, positionalArgs } from "./lib/locale.mjs";
//   const L = resolveLocale();          // --locale=en ou MOT_LOCALE=en
//   readFileSync(join(L.poolDir, "bank.json"))

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_LOCALE = "fr";
export const LOCALES = ["fr", "en"];

// lib → scripts → content → racine du dépôt
export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const FLAG = "--locale=";

export function parseLocale(argv = process.argv.slice(2)) {
  const flag = argv.find((a) => a.startsWith(FLAG));
  const locale = flag ? flag.slice(FLAG.length) : process.env.MOT_LOCALE ?? DEFAULT_LOCALE;
  if (!LOCALES.includes(locale)) {
    throw new Error(`langue inconnue : "${locale}" (attendu : ${LOCALES.join(", ")})`);
  }
  return locale;
}

/** Les arguments positionnels, une fois `--locale=…` retiré. */
export function positionalArgs(argv = process.argv.slice(2)) {
  return argv.filter((a) => !a.startsWith(FLAG));
}

export function resolveLocale(argv) {
  const locale = parseLocale(argv);
  const isDefault = locale === DEFAULT_LOCALE;
  return {
    locale,
    isDefault,
    root,
    poolDir: isDefault ? join(root, "content", "pool") : join(root, "content", "pool", locale),
    outDir: isDefault ? join(root, "public") : join(root, "public", locale),
    embeddedDir: join(root, "Mot", "Resources"),
    // GameData.json en français, GameData-en.json ailleurs : les deux sont
    // embarqués dans le même binaire, l'app choisit selon sa langue.
    suffix: isDefault ? "" : `-${locale}`,
  };
}
