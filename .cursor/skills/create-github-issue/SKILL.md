---
name: create-github-issue
description: >-
  Rédige et crée un ticket GitHub (gh issue create) pour une phase ou un
  correctif de Beelz' Closet. Corps en français : objectif métier, règles,
  hors CDC, recette, annexe technique courte. Use when the user asks to
  write or open a GitHub issue, ticket, or phase backlog item.
---

# Ticket GitHub

Lire [github-issue.md](../../references/github-issue.md) avant de rédiger. Pas de Jira, pas de `VH-NNNN`. Ne pas ouvrir l’issue sans demande explicite. Ne pas implémenter le ticket.

## Avant d’écrire

1. Lire le module du CDC (`README.md` §2 et §6) et `.cursor/references/phase-*.md` s’il existe.
2. Si le code de la phase existe, le lire. Décrire le livré. Ne pas contredire le schéma ou les endpoints déjà en place.
3. `gh issue list --limit 50 --state all` : une phase = une issue. Si elle existe, `gh issue edit` sauf demande contraire.
4. Regrouper par résultat (schéma, writer, batch, UI), pas par fichier.

## Création

`gh issue create --title "<titre>" --body-file <fichier>`.

Titre : `phase <id> — <résultat métier>`. Renvoyer l’URL.

Phase déjà mergée : créer l’issue, puis `gh issue close` avec un commentaire qui cite la PR.
