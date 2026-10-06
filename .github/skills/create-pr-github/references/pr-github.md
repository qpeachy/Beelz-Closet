# Corps de PR — Beelz' Closet

Français. Le lecteur n'a pas suivi le diff. Partir du diff, pas des messages de commit. Une PR = une phase ou un correctif : ne pas décrire le travail déjà sur la base.

Chaque promesse (statut HTTP, champ, fichier servi, libellé d'écran) doit exister dans le code. Si rien ne l'alimente, le dire dans **À savoir**, ou ne pas l'annoncer.

## Template

```markdown
## Description

Pour chaque comportement : **problème** (ce qu'on obtient sans le changement) → **cause** → **changement**, puis **pourquoi** (ce qui est stocké en SQL, ce qui reste un fichier ou un calcul).

Un exemple nommé avec des données réelles du dépôt (`haut`, `travail`, UUID seed, fichier JPEG). Pas d'exemple inventé. Un tableau avant / après seulement s'il décrit la réponse ou l'écran. Le plan de test n'y est pas.

**À savoir** : ce que le diff ne fait pas (phase CDC suivante).

## Étapes de test

Pas de tableau. Une étape = un parcours. Actions séparées par `→`. Le résultat est la ligne suivante, qui commence par `→`.

Où lancer, quoi envoyer, quoi lire. Le texte attendu est celui de la réponse ou de l'écran, collé à `SETUP.md` et aux seeds.

Migration, variable d'env ou lint : seulement s'ils sont dans le diff.

## Fichiers majeurs

Quelques fichiers, dans l'ordre de lecture du comportement. Pas la liste complète du diff.

- Migration SQL
- Nest (UC, command/query, controller)
- FastAPI / Angular seulement s'ils changent
- `SETUP.md` ou la doc de phase si le parcours en dépend

## Nouveaux paquets / variables

Paquets (`package.json`, `uv.lock`) et variables (`.env.example` uniquement). Usage. Écrire « Aucun » si le diff n'en ajoute pas. Ne jamais coller un secret.

## Checklist

- [ ] Migration up/down cohérente avec le schéma décrit
- [ ] Tests ou lint du projet touché
- [ ] Pas de `.env` ni de photo dans le diff
- [ ] Phase CDC respectée (pas de feature N+1)
```

## Sources

| Section | Où lire |
| --- | --- |
| Pourquoi de la phase | `README.md` (CDC §6) et `references/phase-*.md` du skill ticket s'il est là |
| Comment lancer | `SETUP.md` |
| Périmètre | controllers et migration du diff, pas le CDC entier |

## Exemple d'étape

`npx nx serve api-nest` → `curl -F file=@photo.jpg -F category=haut -F situation=travail http://localhost:3333/items`

→ `201`, corps avec une URL `/files/<uuid>.jpg`. `GET` sur cette URL renvoie le fichier.
