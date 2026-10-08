---
description: Phase 3 — composer une tenue. Lire avant de toucher le matching.
---

# Phase 3 — composition

Une tenue = meilleur haut, bas et chaussures pour un contexte, plus les pièces optionnelles au-dessus d’un seuil. Jusqu’à deux alternatives, en remplaçant une catégorie obligatoire par son deuxième choix. Pas de produit cartésien.

## Fait

- Migration `outfit_recommendations` (`context_snapshot`, `item_ids`). `coherence_score` et `feedback_rating` restent vides.
- FastAPI `POST /outfits` et `GET /outfits`. Nest n’écrit pas cette table.
- Score : situation 0,3, mood 0,3, météo 0,4 (condition exacte et distance de température sur 20 °C, partagés). Seuil optionnel 0,5.

## Hors scope

Import CSV, Open-Meteo, cohérence couleur, poids par utilisatrice, UI, feedback.

## Requête

Les candidats filtrent `items.user_id` et `deleted_at IS NULL`, puis joignent `metrics`. L’index `items_user_active_idx` est celui de la phase 1. Lancer `EXPLAIN` une fois la migration appliquée.
