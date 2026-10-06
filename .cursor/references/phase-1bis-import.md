---
description: Phase 1bis — import CSV et photos. Lire avant de toucher le batch.
---

# Phase 1bis — import

Un CSV + un dossier de photos, une ligne = une pièce. FastAPI écrit `items` et `metrics`. Les CHECK et FK de la phase 1 restent la règle.

## Fait

- `POST /imports` avec `csvPath` et `photosDir`.
- Clé `item_import_keys` : hash du fichier + date + utilisatrice.
- Libellé inconnu créé. Catégorie inconnue : `single`, non obligatoire.
- Météo absente : pièce importée, `weatherMissing` dans le rapport.

## Hors scope

Open-Meteo, composition, UI.
