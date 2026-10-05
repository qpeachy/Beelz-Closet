# Pistes d’audit — Beelz' Closet

Vérifier le contexte. Ne pas rapporter un motif dans un test ou un exemple.

## Accès

Pas de JWT avant la phase 4. Jusque-là, `x-user-id` est un risque accepté s’il est écrit comme tel.

```bash
rg -n "x-user-id|Jwt|AuthGuard" apps/api-nest apps/api-matching
rg -n "@(Get|Post|Patch|Delete)\(" apps/api-nest/src --glob "*.controller.ts"
```

Toute lecture ou mise à jour par id doit filtrer `user_id` et `deleted_at IS NULL`.

## Fichiers

```bash
rg -n "path\.join|createReadStream|sendFile|readFile" apps/api-nest/src
```

`GET /files/:filename` doit refuser tout chemin qui n’est pas `uuid.ext` sous le dossier de stockage.

## Injection

SQL manuel : paramètres liés (`$1`), pas une concaténation d’un champ client. Le nom de table dans un `switch` figé est acceptable. Une interpolation de libellé ne l’est pas.

```bash
rg -n "query\(|query\\(" apps/api-nest/src apps/api-matching -g '!*.spec.ts'
```

## Secrets et config

```bash
rg -n "password|secret|api[_-]?key" compose.yaml .env.example apps -g '!.env' -i
```

`.env` ne doit pas être suivi par git. Le mot de passe `beelz` de `.env.example` est une démo : le noter en info, pas en critique.

## Dépendances et supply chain

`package-lock.json` présent. Pas de `postinstall` inattendu. FastAPI : dépendances dans `apps/api-matching` (uv), pas seulement `npm audit`.

## Météo (phase 2+)

URL Open-Meteo fixe. Pas d’URL fournie par le client passée à `fetch`.
