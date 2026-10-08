---
name: api-and-interface-design
description: >-
  Cadre le contrat entre Nest, FastAPI, Postgres et Angular : erreurs, limites,
  idempotence, qui écrit quoi. Use when designing or changing an endpoint,
  a module boundary, or the item, import, or matching API.
---

# Contrat d’API

Lire [api-contract.md](references/api-contract.md) avant d’ajouter un endpoint ou un import. Le contrat se décide avant le handler.

## Règles

1. **Une forme d’erreur** par service. Nest items : 400 `{message}`, 404, 204 au delete. Health des deux API : 200 ou 503, même corps `{status, database}`. Ne pas envelopper l’un dans `{detail}` et pas l’autre.
2. **Valider à la frontière** : body, multipart, CSV, réponse Open-Meteo. Pas une seconde fois entre use case et query déjà typés.
3. **Ajouter des champs, ne pas les renommer.** Un champ public (`category`, `recordedAt`, URL `/files/…`) est un contrat dès qu’un curl ou le front s’en sert.
4. **Listes qui grossissent** (`/items`, stats, recos) : `limit` avant l’écran. `/lookups` reste petit, pas de pagination artificielle.
5. **Idempotence** des écritures rejouées (import, job d’agrégat) : clé stable dérivée de l’intention, contrainte unique, même clé + payload différent = rejet. Pas un `SELECT` puis `INSERT`.

## Qui écrit

| Table | Writer |
| --- | --- |
| `items`, `metrics`, lookups interactifs | Nest |
| import CSV, matching, agrégats | FastAPI |
| contraintes non négociables | Postgres (CHECK, FK) |

Si FastAPI insère aussi dans `items`, le dire dans le ticket et s’aligner sur les mêmes CHECK. Pas une troisième validation.
