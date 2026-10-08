---
name: documentation-and-adrs
description: >-
  Écrit une ADR quand une décision d’archi est difficile à revenir en arrière
  (schéma, writer, auth, stockage). Use when recording why a technical choice
  was made, or when the same trade-off is explained again.
---

# ADR

Documenter le pourquoi, pas le code. Pas d’ADR pour un renommage ou un prototype jetable. Gabarit : [adr-template.md](../../references/adr-template.md).

## Quand

Choix dur à défaire ou surprenant sans contexte : moteur SQL, qui écrit une table, photos hors base, auth, où vit le client Open-Meteo.

## Où

`docs/adr/NNNN-slug.md`, numéro qui suit le dernier fichier. Ne pas supprimer une ADR. Si la décision change : nouvelle ADR qui marque l’ancienne `Superseded`.

## Écrire

Contexte (phase CDC, contrainte), décision, alternatives rejetées, conséquences. Dix lignes suffisent. Français.

Ne pas créer le fichier tant que l’utilisatrice n’a pas demandé de figer la décision. Le README et `SETUP.md` restent le mode d’emploi ; l’ADR ne les recopie pas.

Commentaire dans le code : uniquement un piège (FK composite, `sslmode`, port 3333). Pas une reprise de ce que la fonction fait déjà.
