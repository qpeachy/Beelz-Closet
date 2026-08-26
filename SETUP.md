# Setup et utilisation — Beelz' Closet

Guide pour installer, lancer et vérifier le monorepo. Le produit (cahier des charges) est dans [`README.md`](README.md).

**Phase actuelle : 0** — socle technique (health + Postgres). Pas d’upload, météo, reco, CSV, ni UI métier.

## Prérequis

| Outil | Version | Rôle |
| --- | --- | --- |
| Node.js | 22.x | Angular, Nest, Nx |
| npm | 10.x (livré avec Node) | `package-lock.json` — pas pnpm |
| Docker + Compose | Docker 24+ / Compose v2 | PostgreSQL + [dbmate](https://github.com/amacneil/dbmate) |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | 0.12.x | FastAPI, Python 3.13, lockfile |

Python n’a pas besoin d’être installé à part : `uv` télécharge **CPython 3.13** dans `apps/api-matching/.venv`.

Installer uv (Linux / macOS), version épinglée comme le projet :

```bash
curl -LsSf https://astral.sh/uv/0.12.5/install.sh | sh
# puis ouvrir un nouveau terminal, ou : source $HOME/.local/bin/env
uv --version   # uv 0.12.5
```

## Premier clone

À la racine du repo :

```bash
cp .env.example .env
npm install
docker compose up -d
```

`docker compose up -d` démarre Postgres (port **5432**) et applique les migrations SQL (`db/migrations`, outil dbmate). Les APIs et le front tournent **sur ta machine**, pas dans Docker.

## Variables d’environnement

Fichier `.env` (gitignoré). Modèle : `.env.example`.

| Variable | Défaut | Usage |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://beelz:beelz@localhost:5432/beelz_closet?sslmode=disable` | **Une** URL pour Nest et FastAPI |
| `NEST_PORT` | `3333` | HTTP Nest (`GET /health`) |
| `MATCHING_PORT` | `8000` | documenté ; le serve FastAPI est encore fixé à 8000 dans Nx |

Identifiants Postgres Compose : user/password/db = `beelz` / `beelz` / `beelz_closet`.

## Lancer les apps

Trois terminaux (ou `npx nx serve <projet>` / scripts npm) :

```bash
npx nx serve api-nest          # http://localhost:3333/health
npx nx serve api-matching      # http://localhost:8000/health
npx nx serve frontend          # http://localhost:4201  (squelette Angular)
```

Équivalent : `npm run serve:nest` · `serve:matching` · `serve:frontend`.

| App Nx | Dossier | Port | Health |
| --- | --- | --- | --- |
| `frontend` | `apps/frontend` | 4201 | — |
| `api-nest` | `apps/api-nest` | 3333 | `GET /health` |
| `api-matching` | `apps/api-matching` | 8000 | `GET /health` |

`GET /health` exécute `SELECT 1` sur Postgres. Réponse attendue : `{"status":"ok","database":"up"}`. Base arrêtée → **HTTP 503**.

Nest n’utilise pas le port 3000 : il est souvent déjà pris par un autre projet.

## Base de données

```bash
npm run db:up         # Postgres seul
npm run db:migrate    # dbmate up (SQL dans db/migrations)
npm run db:rollback   # dbmate down (dernière migration)
npm run db:down       # arrête Compose (volume Postgres conservé)
```

`docker compose up -d` relance Postgres + un one-shot dbmate. Schéma métier (`items`, `metrics`, …) = **phase 1**, pas encore.

## Tests et lint

```bash
npx nx run-many -t lint,test,build -p frontend,api-nest,api-matching
npx nx test api-nest
npx nx test api-matching    # pytest via uv
npx nx lint api-matching    # ruff
```

## Arborescence utile

```
apps/frontend          Angular
apps/api-nest          NestJS (CRUD / auth plus tard)
apps/api-matching      FastAPI (matching, batch, agrégats plus tard)
db/migrations          SQL brut (dbmate), source de vérité du schéma
compose.yaml           Postgres + dbmate
.env.example           modèle d’env
```

## Dépannage

| Symptôme | Piste |
| --- | --- |
| `EADDRINUSE :::3000` / 3333 / 4200 / 8000 | Un autre process occupe le port ; Nest = `NEST_PORT`, front = `port` dans `apps/frontend/project.json` |
| `uv: command not found` | Réinstaller uv et recharger le PATH (`~/.local/bin`) |
| Health 503 alors que Compose est up | Attendre le healthcheck Postgres ; vérifier `.env` (`localhost`, pas `postgres` — `postgres` est le hostname **dans** le réseau Docker) |
| Nx ne voit pas `api-matching` | `npx nx reset` puis `npx nx show projects` |
| Port 5432 déjà pris | Autre Postgres local ; arrêter le service ou changer le mapping dans `compose.yaml` |
