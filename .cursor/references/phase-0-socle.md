---
description: Phase 0 — socle Nx + Nest + FastAPI + Postgres. Lire pour enseigner ou implémenter la phase 0.
---

# Phase 0 — socle

Installer le monorepo et prouver que les deux APIs + Postgres communiquent. Pas de domaine `items` / matching / Angular métier.

## Done

1. Trois apps Nx : Angular (squelette), Nest, FastAPI.
2. Postgres local (Docker Compose) ; une `DATABASE_URL` partagée.
3. `GET /health` Nest et FastAPI → 200.
4. Une migration minimale (preuve du pipeline SQL) — schéma métier = phase 1.
5. README : docker, `.env.example`, commandes `nx serve`.

## Hors scope

Upload, météo, reco, CSV, S3, UI métier.

## Décisions (entretien DE)

- **Une** Postgres, deux runtimes (Nest = CRUD/auth/upload ; Python = matching, batch, agrégats pandas/SQL). Évite deux sources de vérité.
- Photos hors SQL (URL objet) — standard data, pas un blob en ligne.
- Ne pas copier vente-hlm (MariaDB, Cellance, Jira).
