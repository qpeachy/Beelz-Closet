---
description: Phase 1 — enregistrer une pièce et ses métriques manuelles. Lire pour la suite du CRUD items.
---

# Phase 1 — enregistrement

Une pièce = une photo (fichier, URL en base) + une catégorie + au moins une situation ou un mood.

## Fait

- Migration `db/migrations/20261004120000_phase1_wardrobe.sql` : users, lookups, items, metrics. Pas de reco ni de table agrégée.
- Nest : `GET /lookups`, CRUD `/items`, fichiers sous `GET /files/…`.
- Soft delete (`deleted_at`). `recorded_at` défaut = maintenant.

## Hors scope

Open-Meteo, import CSV, composition de tenue, UI Angular, auth JWT (user seed local).
