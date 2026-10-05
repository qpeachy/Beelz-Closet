---
name: create-pr-github
description: >-
  Crée une pull request GitHub pour la branche courante de Beelz' Closet
  (gh pr create). Description en français : ce qui a été fait et pourquoi,
  par bloc (schéma, API, fichiers, hors CDC). Use when the user asks to open,
  create, or update a GitHub pull request or PR.
---

# Créer une PR GitHub

Lire [pr-github.md](references/pr-github.md) avant de rédiger titre et corps. Ne pas appeler l’API Bitbucket. Ne pas pousser ni ouvrir la PR sans demande explicite.

## Préflight

1. Remote `origin` → `owner/repo` GitHub (`git@github.com:…` ou HTTPS).
2. Base : argument utilisateur, sinon `main`.
3. Branche courante ≠ base. `git fetch origin`. Diff `origin/<base>...HEAD` non vide.
4. `gh pr list --head <branche> --state open` : si une PR existe, la mettre à jour seulement si demandé (`gh pr edit`).
5. Branche non poussée ou en retard sur `origin` : stopper et demander avant `git push -u origin HEAD`.

## Titre

Pas de ticket `VH-NNNN`. Si un seul commit dont le sujet est `type(scope): …`, le reprendre. Sinon un titre qui dit le résultat de la branche : `{type}({scope}): {résultat}`. Type = le changement dominant (`feat`, `fix`, `docs`, `chore`). Scope = la phase ou le sujet (`phase-1`), pas le nom de branche avec `/`.

## Corps

Générer le template de `pr-github.md` à partir de :

- `git log origin/<base>..HEAD --reverse`
- `git diff origin/<base>...HEAD`

La section Description explique chaque bloc (quoi + pourquoi métier/data + ce que ça débloque). Pas une liste de fichiers.

## Création

```bash
gh pr create --base <base> --head <branche> --title "<titre>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

`draft` seulement si demandé (`--draft`). Renvoyer l’URL. Ne pas merger.
