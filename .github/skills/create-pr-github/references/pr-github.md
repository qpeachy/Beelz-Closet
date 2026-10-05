# Corps de PR — Beelz' Closet

Français. Métier d’abord (pièce, métrique, contrat, qualité, phase CDC), puis le mécanisme. Une PR = une phase ou un correctif : ne pas décrire le travail des phases déjà sur la base.

## Template

```markdown
## Description

Pour chaque bloc du diff (schéma, writer API, stockage, contrat, doc), un paragraphe :

- ce qui est en place (tables, endpoints, règle de validation, fichier hors Postgres) ;
- pourquoi (donnée exploitable plus tard, une seule base, phase CDC, contrainte métier) ;
- ce que ça ne fait pas encore, si la phase suivante en dépend.

## Étapes de test

Commandes réelles du diff : `npm run db:migrate`, `npx nx test|lint|serve <projet>`, curl ou parcours UI. Données minimales (lookup seed, header, fichier). Cas refusé (validation, 404, soft delete).

## Fichiers majeurs

Grouper. Une ligne = chemin + rôle, pas seulement le nom.

- Migration SQL
- Nest (UC, command/query, controller)
- FastAPI / Angular seulement s’ils changent
- Doc de phase (`.cursor/references/phase-*.md`, `SETUP.md`)

## Nouveaux paquets / variables

Paquets (`package.json`, `uv.lock`) et variables (`.env.example` uniquement). Usage. Écrire « Aucun » si le diff n’en ajoute pas. Ne jamais coller un secret.

## Checklist

- [ ] Migration up/down cohérente avec le schéma décrit
- [ ] Tests ou lint du projet touché
- [ ] Pas de `.env` ni de photo dans le diff
- [ ] Phase CDC respectée (pas de feature N+1)
```

## Sources

| Section | Où lire |
| --- | --- |
| Pourquoi de la phase | `.cursor/references/phase-*.md` et `README.md` (CDC §6) |
| Comment lancer | `SETUP.md` |
| Périmètre API | controllers et migration du diff, pas le CDC entier |
