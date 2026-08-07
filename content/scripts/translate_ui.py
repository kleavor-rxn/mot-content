#!/usr/bin/env python3
# Traduit `Mot/Localizable.xcstrings` FR → EN à partir d'un dictionnaire
# maintenu ici. Les clés absentes du dictionnaire restent en état `new` pour
# révision manuelle. Les clés purement techniques (formats, symboles, emojis)
# sont explicitement mappées à leur propre valeur avec l'état `translated`
# — leur "traduction" est « pareil ».
#
# Usage : python3 content/scripts/translate_ui.py
#   Idempotent : relancer ne casse rien, écrase seulement les vides.

from __future__ import annotations

import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
XCSTRINGS = ROOT / "Mot" / "Localizable.xcstrings"

# --- Registre EN retenu ------------------------------------------------------
# - Tutoiement neutre (« you »).
# - Noms de jeux alignés Android (PLAY-STORE.md + strings-en.xml) :
#   Sudoku, Hidden Word, Slang, Pyramid, Taboo, Cursed Word, Countdown,
#   Mental Math, Number Series, Crossword, Mix Mode, Ware Mode.
# - « MON0 » et « Mot. / Nombre. » sont des marques ; ils gardent leur nom.

TRANSLATIONS: dict[str, str] = {
    # --- Techniques : identique au français ---
    " ": " ",
    "?": "?",
    "·": "·",
    "→": "→",
    "↓": "↓",
    "=": "=",
    "−": "−",
    "⚡": "⚡",
    "❤️": "❤️",
    "🎉": "🎉",
    "🏆": "🏆",
    "💡": "💡",
    "💪": "💪",
    "🔥": "🔥",
    "🖤": "🖤",
    "🥔": "🥔",
    "🧮": "🧮",
    "0": "0",
    "1": "1",
    "3": "3",
    "5": "5",
    "30s": "30s",
    "60s": "60s",
    "90s": "90s",
    "0 pts": "0 pts",
    "%lld": "%lld",
    "%lld.": "%lld.",
    "%lld%%": "%lld%%",
    "%lld/%lld": "%lld/%lld",
    "%lld/81": "%lld/81",
    "%lld×%lld": "%lld×%lld",
    "%llds": "%llds",
    "×%lld": "×%lld",
    "+%lld": "+%lld",
    "🔥 %lld": "🔥 %lld",
    "🔥%lld": "🔥%lld",
    "🔥 ×%@": "🔥 ×%@",
    "#%lld %@": "#%lld %@",
    "%@ %lld": "%@ %lld",
    "Q %lld/%lld": "Q %lld/%lld",
    "VS": "VS",
    "TABOU 🚫": "TABOO 🚫",
    "TROUVÉ": "GOT IT",
    "PASSER": "PASS",

    # --- Noms de jeux ---
    "Sudoku": "Sudoku",
    "Mot Caché": "Hidden Word",
    "Argots": "Slang",
    "Pyramide": "Pyramid",
    "Mot Interdit": "Taboo",
    "Maudit Mot Dit": "Cursed Word",
    "Le Compte est bon": "Countdown",
    "Calcul Mental": "Mental Math",
    "Suites Logiques": "Number Series",
    "Mots Fléchés": "Crossword",
    "Mode Mix": "Mix Mode",
    "Mode Ware": "Ware Mode",
    "Sudoku Relais": "Relay Sudoku",
    "Calcul": "Math",
    "Compte": "Countdown",
    "Suites": "Series",

    # --- Défi du jour ---
    "Défi du jour": "Daily challenge",
    "Sudoku du jour": "Sudoku of the day",
    "Mot du jour": "Word of the day",
    "Argots du jour": "Slang of the day",
    "Grille du jour": "Grid of the day",
    "défis réussis": "challenges done",
    "%lld défis relevés": "%lld challenges done",
    "Récap des défis": "Challenge recap",
    "Ces deux dernières semaines": "The last two weeks",
    "Rattrapage": "Catch-up",
    "Rattrapage — ne compte ni dans la série ni au classement du jour":
        "Catch-up — doesn't count toward your streak or today's leaderboard",
    "Un jour manqué reste jouable — il ne compte pas dans la série.":
        "A missed day stays playable — it just doesn't count toward your streak.",
    "Le mot du jour est le même pour tout le monde — un seul essai par jour. L'entraînement est illimité.":
        "The word of the day is the same for everyone — one attempt per day. Practice is unlimited.",
    "Chaque jour à %lld h": "Every day at %lld:00",
    "Reçois une alerte pour ton défi du jour":
        "Get a reminder for your daily challenge",
    "Rappel quotidien": "Daily reminder",

    # --- Actions courantes ---
    "Valider": "Confirm",
    "Vérifier": "Check",
    "Menu": "Menu",
    "Retour": "Back",
    "Retour à l'accueil": "Back to home",
    "Fermer": "Close",
    "Annuler": "Cancel",
    "Enregistrer": "Save",
    "Supprimer": "Delete",
    "Renommer": "Rename",
    "Changer": "Change",
    "Recommencer": "Play again",
    "Nouvelle Partie": "New game",
    "Commencer": "Start",
    "Lancer la partie": "Start the game",
    "Lancer le Mix !": "Start Mix!",
    "C'est parti !": "Let's go!",
    "Compris": "Got it",
    "Passer": "Pass",
    "Passer mon tour": "Skip my turn",
    "Trouvé": "Got it",
    "Trouvé !": "Got it!",
    "Bravo !": "Well done!",
    "Félicitations !": "Congrats!",
    "Fin de la manche !": "End of round!",
    "Partie terminée": "Game over",
    "Partie terminée !": "Game over!",
    "Terminé !": "Done!",
    "Grille complète !": "Grid complete!",
    "Sudoku résolu !": "Sudoku solved!",
    "Le compte est bon !": "Bang on!",
    "Nouveau record !": "New record!",
    "Mot trouvé": "Word found",
    "Le mot": "The word",
    "C'était": "It was",
    "C'était « %@ »": "It was “%@”",
    "Le mot n'a pas été trouvé": "The word wasn't found",
    "Échec": "Failed",
    "Échec !": "Failed!",
    "Raté…": "Missed…",
    "Abandonné": "Given up",
    "Temps écoulé !": "Time's up!",
    "Le temps est écoulé": "Time's up",
    "Tour passé": "Turn skipped",
    "Raté — tu passes la main": "Missed — pass the phone",
    "Raté ! Encore un essai": "Missed! One more try",
    "Raté ! Un indice de plus…": "Missed! Another clue…",

    # --- Scores et statistiques ---
    "Score": "Score",
    "Scores": "Scores",
    "Classement": "Leaderboard",
    "Classements": "Leaderboards",
    "Classement Final": "Final ranking",
    "Voir le classement": "See leaderboard",
    "Voir les classements": "See leaderboards",
    "Voir le résultat": "See result",
    "Meilleure série": "Best streak",
    "Multiplicateur max": "Max multiplier",
    "Points gagnés": "Points earned",
    "points": "points",
    "points sur %lld": "points out of %lld",
    "pts": "pts",
    "temps": "time",
    "%lld pts": "%lld pts",
    "+%lld pts": "+%lld pts",
    "%lld atteint en %@": "%lld reached in %@",
    "%lld/%lld bonnes réponses": "%lld/%lld correct",
    "%lld indices": "%lld clues",
    "Avec %lld indice%@": "With %lld clue%@",
    "Avec %lld indice%@ utilisé%@": "With %lld clue%@ used",
    "Indices utilisés : %lld/%lld": "Clues used: %lld/%lld",
    "Vaut %lld point%@ si tu trouves maintenant":
        "Worth %lld point%@ if you find it now",
    "%lld lettres · vaut %lld pts": "%lld letters · worth %lld pts",
    "%lld point%@": "%lld point%@",
    "%lld pt%@": "%lld pt%@",
    "+%lld point%@": "+%lld point%@",
    "En %lld essai%@": "In %lld attempt%@",
    "Essai %lld/%lld": "Attempt %lld/%lld",
    "Manche %lld/%lld": "Round %lld/%lld",
    "%lld tour%@ restant%@": "%lld turn%@ remaining",
    "%lld secondes par défi": "%lld seconds per challenge",
    "%lld partie%@": "%lld game%@",
    "%lld joueur%@": "%lld player%@",
    "Aucune partie jouée pour l'instant": "No games played yet",
    "Aucune grille disponible": "No grid available",

    # --- Éléments d'écran ---
    "Ta réponse": "Your answer",
    "Votre réponse...": "Your answer...",
    "Nom": "Name",
    "Nom du joueur…": "Player name…",
    "Joueurs": "Players",
    "Premier joueur": "First player",
    "Prochain joueur": "Next player",
    "Tour de %@": "%@'s turn",
    "Au tour de %@": "%@'s turn",
    "À %@": "For %@",
    "%@ l'emporte": "%@ wins",
    "joue": "playing",
    "actif": "active",
    "Objectif": "Goal",
    "Cible": "Target",
    "Difficulté": "Difficulty",
    "Débutant": "Beginner",
    "Normal": "Normal",
    "Rapide": "Fast",
    "Mode": "Mode",
    "Mode de jeu": "Game mode",
    "Solo": "Solo",
    "Un jeu à plusieurs": "A group game",
    "Manches": "Rounds",
    "Manche suivante": "Next round",
    "Nombre de manches": "Number of rounds",
    "Nombre de défis": "Number of challenges",
    "Nombre de questions": "Number of questions",
    "Questions": "Questions",
    "Durée": "Duration",
    "Durée du tour": "Turn length",
    "Vitesse": "Speed",
    "Vies restantes :": "Lives left:",
    "Jeux inclus": "Games included",
    "Grilles": "Grids",
    "Notes": "Notes",
    "Thème": "Theme",
    "Vibrations": "Haptics",
    "Sons": "Sounds",
    "Profil : %@": "Profile: %@",
    "Profils": "Profiles",
    "Nouveau profil…": "New profile…",
    "Rendre actif": "Set active",
    "Renommer le profil": "Rename profile",
    "Passe-lui le téléphone — le chrono démarre à l'appui.":
        "Pass the phone — the timer starts on tap.",

    # --- Descriptions des jeux (Règles) ---
    "Remplissez la grille 9×9 sans erreur": "Fill the 9×9 grid without a mistake",
    "Devinez le mot de 5 lettres en 6 essais":
        "Guess the 5-letter word in 6 attempts",
    "Devinez le mot du jour en 6 essais": "Guess today's word in 6 attempts",
    "Grilles de mots croisés à compléter": "Crossword grids to complete",
    "Maîtrisez le langage des rues": "Master street language",
    "Trouvez le nombre qui prolonge la suite": "Find the number that continues the series",
    "Atteignez la cible en combinant six nombres": "Reach the target by combining six numbers",
    "Opérations rapides et streak de bonnes réponses":
        "Fast math and correct-answer streaks",
    "Opérations rapides et streaks de bonnes réponses":
        "Fast math and correct-answer streaks",
    "Choisir les bons indices sans trop en donner":
        "Choose the right clues without giving too much",
    "Décrire sans utiliser les mots interdits":
        "Describe without using the forbidden words",
    "Décrivez sans utiliser les mots interdits":
        "Describe without using the forbidden words",
    "Faire deviner le mot": "Make them guess the word",
    "Faire deviner sans utiliser les mots interdits":
        "Make them guess without using the forbidden words",
    "Faire deviner un mot avec des indices progressifs":
        "Guide guesses with clues revealed one at a time",
    "Enchaînez des défis issus de plusieurs jeux": "Chain challenges across several games",
    "Enchaînez plusieurs jeux": "Chain several games",
    "Micro-défis ultra-rapides": "Ultra-fast micro-challenges",
    "Micro-défis ultra-rapides style WarioWare": "Ultra-fast WarioWare-style micro-challenges",
    "Mélange de tous les jeux": "A mix of all the games",

    # --- Règles détaillées ---
    "Règles": "Rules",
    "Comment jouer": "How to play",
    "Choisir un jeu": "Choose a game",
    "Choisir une autre grille": "Choose another grid",
    "Choisis la bonne parmi les propositions.": "Choose the correct one from the options.",
    "Choisis les jeux à inclure et le nombre de manches.":
        "Choose which games to include and the number of rounds.",
    "Choisis une définition": "Choose a definition",
    "Choisissez la bonne définition": "Choose the correct definition",
    "Choisissez une grille à compléter": "Choose a grid to complete",
    "Sélectionne une définition, puis saisis le mot correspondant.":
        "Pick a clue, then type the matching word.",
    "Complète la grille à ton rythme.": "Complete the grid at your own pace.",
    "Le chrono compte : le classement du jour récompense le plus rapide.":
        "The timer counts: today's leaderboard rewards the fastest.",
    "Le chrono tourne : bats ton meilleur temps.":
        "The clock's running — beat your best time.",
    "La grille est terminée quand toutes les cases sont remplies.":
        "The grid is done when every cell is filled.",
    "Les mots se croisent : une lettre trouvée en aide une autre.":
        "Words cross each other: a letter found helps the next one.",
    "Remplis la grille avec les chiffres de 1 à 9.":
        "Fill the grid with digits 1 to 9.",
    "Chaque ligne, chaque colonne et chaque bloc de 3×3 doit contenir tous les chiffres, une seule fois.":
        "Each row, column and 3×3 block must contain every digit exactly once.",
    "Le mode notes permet d'inscrire des hypothèses dans une case.":
        "Notes mode lets you jot down guesses inside a cell.",
    "Trouve le mot de 5 lettres en 6 essais maximum.":
        "Find the 5-letter word in 6 attempts max.",
    "Vert : la lettre est bien placée. Jaune : elle est dans le mot, ailleurs. Gris : elle n'y est pas.":
        "Green: right letter, right spot. Yellow: right letter, wrong spot. Grey: not in the word.",
    "Moins tu utilises d'essais, mieux c'est. Partage ta grille sans révéler le mot.":
        "Fewer attempts is better. Share your grid without revealing the word.",
    "Un mot d'argot s'affiche avec plusieurs définitions.":
        "A slang word appears with several definitions.",
    "Trouve le terme suivant parmi 4 propositions.":
        "Find the next term from 4 options.",
    "Une suite de nombres suit une règle cachée.":
        "A number sequence follows a hidden rule.",
    "La règle est révélée après chaque réponse.":
        "The rule is revealed after each answer.",
    "Combine deux plaques avec + − × ÷ : le résultat devient une nouvelle plaque.":
        "Combine two tiles with + − × ÷: the result becomes a new tile.",
    "Six plaques sont tirées, une cible s'affiche : atteins-la exactement.":
        "Six tiles are drawn and a target appears — reach it exactly.",
    "Seuls les résultats entiers et positifs sont permis. Chaque tirage a une solution.":
        "Only positive whole results are allowed. Every draw has a solution.",
    "Résous un maximum d'opérations avant la fin du temps imparti.":
        "Solve as many operations as you can before time runs out.",
    "Chaque bonne réponse enchaînée augmente ton multiplicateur.":
        "Each correct answer in a row boosts your multiplier.",
    "Une erreur ou un temps écoulé remet le multiplicateur à zéro.":
        "One mistake or a timeout resets the multiplier.",
    "Ce jeu se joue à plusieurs, à l'oral.": "This game is played with others, out loud.",
    "En groupe : fais deviner le mot sans jamais prononcer les mots interdits.":
        "As a group: make them guess the word without ever saying the forbidden ones.",
    "En groupe : un joueur fait deviner le mot aux autres avec ses propres indices.":
        "As a group: one player makes the others guess with their own clues.",
    "En solo : les indices se dévoilent un à un, à toi de trouver le mot.":
        "Solo: clues appear one by one — find the word.",
    "En solo : devine le mot à partir des mots qui lui sont associés.":
        "Solo: guess the word from the words linked to it.",
    "En solo, seuls les défis jouables seul sont proposés.":
        "In solo, only single-player challenges are offered.",
    "En solo : Argots, Calcul, Compte et Suites. Pyramide et Taboo demandent un meneur — ajoutez des joueurs, ou jouez-y en solo depuis leur propre écran.":
        "Solo mode: Slang, Math, Countdown and Series. Pyramid and Taboo need a leader — add players, or play them solo from their own screen.",
    "Deux mots proches sont proposés : tu dois faire deviner le premier.":
        "Two close words are offered — make them guess the first.",
    "Tes indices ne doivent surtout pas faire penser au second.":
        "Your clues must never hint at the second one.",
    "Le nombre d'indices imposés varie selon la paire.":
        "The number of required clues varies by pair.",
    "Une mauvaise réponse dévoile l'indice suivant — la manche continue tant qu'il reste des indices.":
        "A wrong answer reveals the next clue — the round continues while clues remain.",
    "Une mauvaise réponse dévoile un mot associé de plus — tu rejoues tant qu'il en reste.":
        "A wrong answer reveals one more linked word — you play on as long as clues remain.",
    "Des défis tirés de plusieurs jeux s'enchaînent.":
        "Challenges from several games chain one after another.",
    "Des micro-défis s'enchaînent à toute vitesse.":
        "Micro-challenges chain at top speed.",
    "Chaque défi a quelques secondes seulement.": "Each challenge only lasts a few seconds.",
    "Trois vies : une erreur ou un temps écoulé en coûte une.":
        "Three lives — a mistake or a timeout costs you one.",
    "1 point par bonne réponse, sur 10 questions.":
        "1 point per correct answer, over 10 questions.",
    "1 point par bonne réponse.": "1 point per correct answer.",
    "1 point par défi réussi.": "1 point per challenge completed.",
    "1 point par défi réussi. La partie s'arrête à zéro vie.":
        "1 point per challenge completed. The game ends when lives reach zero.",
    "5 points avec un seul indice, puis −1 par indice, minimum 1.":
        "5 points with a single clue, then −1 per extra clue, minimum 1.",
    "10 points par bonne réponse, multipliés jusqu'à ×4 par la série.":
        "10 points per correct answer, multiplied up to ×4 by the streak.",
    "10 questions par partie.": "10 questions per game.",
    "Chacun son tour : un mot trouvé rapporte les lettres qu'il révèle, et tu rejoues. Faux ou passé, la main change.":
        "Take turns: a found word scores the letters it reveals, and you play again. Wrong or skipped, control passes.",
    "À plusieurs : tu enchaînes jusqu'à l'échec, puis tu passes le téléphone":
        "In a group: chain answers until you miss, then pass the phone",
    "À plusieurs : tu poses des chiffres jusqu'à l'erreur, puis la main passe":
        "In a group: place digits until a mistake, then the phone passes",

    # --- Modes de jeu ---
    "Mot → Définition": "Word → Definition",
    "Définition → Mot": "Definition → Word",
    "Fais deviner ce mot :": "Make them guess this word:",
    "Faire deviner :": "Make them guess:",
    "Fais deviner ce mot :": "Make them guess this word:",
    "Mot maudit à utiliser": "Cursed word to work around",
    "TABOO 🚫": "TABOO 🚫",
    "Indice": "Clue",
    "Indice (%lld)": "Clue (%lld)",
    "Indices donnés": "Clues given",
    "Donner un indice": "Give a clue",
    "Utiliser un indice": "Use a clue",
    "Mots trouvés": "Words found",
    "Mots passés": "Words skipped",
    "Passé": "Skipped",
    "Que veut dire ce mot ?": "What does this word mean?",
    "Quelle est ce mot d'argot ?": "Which word matches this slang?",
    "Quel nombre prolonge la suite ?": "Which number continues the series?",
    "Quel est le résultat ?": "What's the result?",
    "Quelle opération atteint la cible ?": "Which operation hits the target?",
    "Tape le plus grand nombre": "Type the biggest number",
    "La cible %lld était atteignable :": "The target %lld was reachable:",
    "Opérations": "Operations",
    "Patate chaude": "Hot potato",
    "Relais": "Relay",

    # --- Multi-joueur ---
    "Ajouter des joueurs d'abord": "Add players first",
    "Ajoutez 2 joueurs depuis l'accueil": "Add 2 players from the home screen",
    "Ajoutez 2 joueurs depuis l'accueil pour débloquer le Relais.":
        "Add 2 players from the home screen to unlock Relay.",
    "Ajoutez au moins 2 joueurs pour jouer en groupe":
        "Add at least 2 players to play as a group",
    "Ajoutez des joueurs depuis l'accueil": "Add players from the home screen",
    "Retournez à l'accueil pour ajouter des joueurs.":
        "Head back to the home screen to add players.",
    "Maudit Mot Dit se joue à l'oral : tout son sel vient des indices que vous inventez pour les autres. Ajoutez au moins 2 joueurs depuis l'accueil.\n\nEnvie de jouer seul ? Essayez Pyramide ou Taboo en mode solo.":
        "Cursed Word is played out loud — the fun is in the clues you invent for others. Add at least 2 players from the home screen.\n\nWant to play alone? Try Pyramid or Taboo in solo mode.",

    # --- Grille ---
    "Ligne %lld, colonne %lld, %@": "Row %lld, column %lld, %@",
    "Touchez pour sélectionner cette case": "Tap to select this cell",
    "Touchez une case pour commencer": "Tap a cell to start",
    "Entraînement": "Practice",
    "Changer de difficulté": "Change difficulty",

    # --- Paywall / IAP ---
    "Jouer sans bandeau": "Play without the banner",
    "Retirer les publicités": "Remove ads",
    "Sans publicité": "Ad-free",
    "Publicités retirées": "Ads removed",
    "Achat unique ou abonnement supporter": "One-time purchase or supporter subscription",
    "Devenir supporter": "Become a supporter",
    "Merci, supporter !": "Thanks, supporter!",
    "Actif — merci pour le soutien": "Active — thank you for the support",
    "Restaurer mes achats": "Restore my purchases",
    "Après une réinstallation ou sur un nouvel appareil":
        "After a reinstall or on a new device",
    "Vous avez déjà retiré le bandeau. Merci !":
        "You've already removed the banner. Thank you!",
    "Votre abonnement est actif. Vous pouvez le gérer dans les réglages de l'App Store.":
        "Your subscription is active. You can manage it in your App Store settings.",
    "L'abonnement se renouvelle automatiquement sauf annulation au moins 24 h avant la fin de la période. Gérable à tout moment dans les réglages de l'App Store.":
        "The subscription renews automatically unless cancelled at least 24 h before the end of the period. Manageable anytime in your App Store settings.",
    "Retire aussi le bandeau, et soutient les mises à jour.":
        "Removes the banner too, and supports updates.",
    "MON0 reste gratuit et complet. Le bandeau finance le contenu quotidien — vous pouvez le retirer.":
        "MON0 stays free and complete. The banner funds daily content — you can remove it.",
    "Offres indisponibles": "Offers unavailable",
    "Vérifiez votre connexion, puis réessayez.": "Check your connection, then try again.",

    # --- Game Center ---
    "Game Center": "Game Center",
    "Connecté%@": "Connected%@",
    "Non connecté": "Not connected",
    "Connecte-toi à Game Center (Réglages iOS) pour comparer tes scores en ligne.":
        "Sign in to Game Center (iOS Settings) to compare your scores online.",
    "Connectez Game Center pour comparer vos scores avec vos amis.":
        "Sign in to Game Center to compare your scores with friends.",
    "Tes classements en ligne sont rattachés à ce compte Apple, en plus des profils locaux.":
        "Your online rankings are tied to this Apple account, in addition to local profiles.",
    "Pas de classement en ligne pour ce jeu.": "No online leaderboard for this game.",

    # --- Divers ---
    "Aide et contact": "Help and contact",
    "Conditions d'utilisation": "Terms of use",
    "Confidentialité": "Privacy",

    # --- Language switcher (Réglages) ---
    "Langue": "Language",
    "Système": "System",
    # Noms de langues : convention iOS = nom natif (« Français » reste
    # « Français », « English » reste « English »), pour que le picker
    # soit lisible même à un utilisateur qui ne comprend pas encore la
    # langue de l'interface.
    "Français": "Français",
    "English": "English",
    "Redémarrez l'app": "Restart the app",
    "La langue de l'interface s'appliquera au prochain lancement. Le contenu (mots, grilles) est déjà dans la langue choisie.":
        "The interface language will apply at the next launch. The content (words, grids) is already in the chosen language.",

    # --- Rappels, validation, reprise (2ᵉ passe) ---
    "%lld h": "%lld:00",
    "Heure du rappel": "Reminder time",
    "Ce jour reste rattrapable — il ne compte pas dans la série.":
        "This day can still be caught up — it just won't count toward your streak.",
    "Défi manqué": "Challenge missed",
    "Il vous reste des tentatives : relancez le défi depuis l'accueil.":
        "You still have attempts left — restart the challenge from the home screen.",
    "Jouer ce défi": "Play this challenge",
    "La dernière validation n'a pas résolu la grille.":
        "The last check didn't complete the grid.",
    "La dernière vérification n'a pas donné une grille juste.":
        "The last check didn't leave a correct grid.",
    "Le défi du jour vous attend.": "Today's challenge is waiting.",
    "Pas encore joué": "Not played yet",
    "Reprendre": "Resume",
    "Réessayer": "Try again",
    "Se connecter à Game Center": "Sign in to Game Center",
    "Valider — %lld restantes": "Check — %lld left",
    "Valider — dernière chance": "Check — last chance",
    "Vérifier (%lld)": "Check (%lld)",
    "Vérifier — dernière": "Check — last one",
}


def apply(catalog: dict) -> tuple[int, int, list[str]]:
    """Retourne (translated, still_new, missing_keys)."""
    strings = catalog.setdefault("strings", {})
    # Créer les entrées absentes pour toute clé du dictionnaire qui n'est
    # pas encore dans le catalogue — utile quand une chaîne source vient
    # d'être ajoutée dans le code Swift mais que Xcode ne l'a pas encore
    # extraite. On les marque `extractionState: manual` (Xcode ne les
    # écrasera pas lors d'un `-exportLocalizations` automatique).
    for key in TRANSLATIONS:
        if key and key not in strings:
            strings[key] = {"extractionState": "manual", "localizations": {}}

    translated = 0
    still_new = 0
    missing: list[str] = []
    for key, entry in strings.items():
        if not key:
            continue
        locs = entry.setdefault("localizations", {})
        en = locs.setdefault("en", {})
        unit = en.setdefault("stringUnit", {})
        current_value = unit.get("value", "")
        current_state = unit.get("state", "new")
        if current_state == "translated" and current_value:
            translated += 1
            continue
        if key in TRANSLATIONS:
            unit["value"] = TRANSLATIONS[key]
            unit["state"] = "translated"
            translated += 1
        else:
            still_new += 1
            missing.append(key)
    return translated, still_new, missing


def main() -> int:
    with XCSTRINGS.open() as f:
        catalog = json.load(f)
    # Xcode exige `version` au top-level et le range en dernier. Sans cette
    # clé, le build échoue avec « Missing required key 'version' ». On la
    # rétablit ici pour survivre à un merge Python qui l'aurait perdue.
    if "version" not in catalog:
        catalog["version"] = "1.0"
    translated, still_new, missing = apply(catalog)
    with XCSTRINGS.open("w") as f:
        # xcstrings garde ses clés triées ; on préserve indent=2 sans trier
        # pour ne pas réordonner ce que Xcode a déjà mis.
        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"translated: {translated}")
    print(f"still new:  {still_new}")
    if missing:
        print("--- clés sans traduction dans le dictionnaire ---")
        for k in sorted(missing):
            print(f"  {k!r}")
    return 0 if still_new == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
