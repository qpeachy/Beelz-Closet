# Setup et utilisation — Beelz' Closet

Guide pour installer, lancer et vérifier le monorepo. Le produit (cahier des charges) est dans [`README.md`](README.md).

**Phase actuelle : 3** — composer une tenue depuis les pièces enregistrées. Pas de météo auto, pas de cohérence couleur, pas d’UI métier.

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

| Variable | Défaut (exemple) | Usage |
| --- | --- | --- |
| `POSTGRES_USER` | `beelz` | User Postgres (Compose) |
| `POSTGRES_PASSWORD` | *(secret, pas dans git)* | Mot de passe Postgres (Compose + URL dbmate) |
| `POSTGRES_DB` | `beelz_closet` | Nom de la base |
| `POSTGRES_PORT` | `5432` | Port publié sur l’hôte |
| `DATABASE_URL` | `postgres://…@localhost:5432/…` | Nest et FastAPI sur l’hôte (`localhost`, pas `postgres`) |
| `NEST_PORT` | `3333` | HTTP Nest (`GET /health`) |
| `MATCHING_PORT` | `8000` | documenté ; le serve FastAPI est encore fixé à 8000 dans Nx |

Compose lit le `.env` à la racine pour interpoler `compose.yaml`. Si tu changes user / mot de passe / db, **aligne aussi** `DATABASE_URL` (même identifiants, host `localhost`).

Un mot de passe avec `@`, `:`, `/` casse l’URL : encoder ou en choisir un simple.

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

## Phase 1 — enregistrer une pièce

Après `npm run db:migrate`, Nest expose :

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| `GET` | `/lookups` | catégories, matières, situations, moods |
| `POST` | `/items` | photo (`file`) + champs formulaire |
| `GET` | `/items` | pièces non supprimées |
| `GET` | `/items/:id` | une pièce |
| `PATCH` | `/items/:id` | JSON partiel |
| `DELETE` | `/items/:id` | soft delete |
| `GET` | `/files/:filename` | la photo (pas en SQL) |

Règle métier : **catégorie obligatoire**, et **situation ou mood** (au moins un). `recordedAt` absent = maintenant. Utilisatrice par défaut : UUID seed `a0000000-0000-4000-8000-000000000001` (header `x-user-id` pour une autre).

```bash
curl -F file=@photo.jpg -F category=haut -F situation=travail \
  http://localhost:3333/items
```

Photos dans `storage/` (ou `STORAGE_DIR`). JPEG, PNG, WebP.

## Phase 3 — composer une tenue

FastAPI, port 8000. La météo du corps est celle du jour, saisie à la main. Elle n’est pas lue sur la pièce : elle sert à scorer les pièces qui ont déjà une température ou une condition. Sans haut, bas ou chaussures actifs, pas de tenue enregistrée.

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| `POST` | `/outfits` | une tenue et jusqu’à deux alternatives |
| `GET` | `/outfits` | les tenues déjà enregistrées |

Même utilisatrice que Nest : UUID seed, ou header `x-user-id`.

```bash
curl -X POST http://localhost:8000/outfits \
  -H 'content-type: application/json' \
  -d '{"situation":"travail","mood":"en forme","weatherCondition":"pluie","temperature":12}'
```

Réponse `201` : `outfits[].items` (id, url, catégorie, score) et `coherenceScore: null`. Catégorie obligatoire vide → `422` et `missing`. Libellé hors référentiel → `400`.

## Phase 1bis — importer un CSV

FastAPI `POST /imports`. Le CSV et le dossier de photos sont des chemins sur la machine qui lance l'API, pas des fichiers envoyés dans la requête. Colonnes obligatoires : `filename`, `category`, `recorded_at` (`AAAA-MM-JJ`), `situation`, `mood`. Une ligne sans fichier, ou avec une date illisible, est rejetée ; les autres continuent. Un libellé inconnu est créé. Relancer le même fichier au même jour ne crée pas une deuxième pièce. La météo vide reste vide (Open-Meteo est la phase 2).

```bash
curl -X POST http://localhost:8000/imports \
  -H 'content-type: application/json' \
  -d '{"csvPath":"/chemin/pieces.csv","photosDir":"/chemin/photos"}'
```

Réponse : `imported`, `rejected`, `duplicates`, `weatherMissing`, `errors[]` avec le numéro de ligne.

## Base de données

```bash
npm run db:up         # Postgres seul
npm run db:migrate    # dbmate up (SQL dans db/migrations)
npm run db:rollback   # dbmate down (dernière migration)
npm run db:down       # arrête Compose (volume Postgres conservé)
```

`docker compose up -d` relance Postgres + un one-shot dbmate. Les stats agrégées restent une phase suivante.

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
