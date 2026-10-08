# Ticket GitHub — Beelz' Closet

Français. Métier d’abord (pièce, contexte, tenue, qualité de donnée), puis le mécanisme. Pas d’analogie du quotidien. Une issue = une ligne du phasage CDC §6 (0, 1, 1bis, 2, 3, 3bis, 4, 5, 6, 7, 8). Ne pas y mettre le travail de la phase suivante.

## Template

```markdown
## Objectif

Ce que l’utilisatrice peut faire à la fin de la phase, en une phrase.

## Pourquoi

Impact produit ou data : quelle donnée devient exploitable, quel contrat, quelle phase ça débloque.

## Comportement attendu

1. Résultats testables, pas une liste de fichiers.

## Règles

Contraintes CDC de cette phase seulement (validation, fallback, qui écrit).

## Hors périmètre

Phases suivantes nommées. Sujets du CDC exclus de la v1 (détection image, app mobile).

## À trancher

Uniquement si le CDC laisse deux options incompatibles. Recommandation + risque. Omettre la section sinon.

## Recette minimale

2 à 4 scénarios : cas nominal, cas refusé, cas vide ou API externe down.

## Annexe technique

3 à 6 points : service writer (Nest ou FastAPI), tables, index déjà posés, décision déjà prise (dbmate, photo hors SQL). Pas de spec d’implémentation.
```

## Checklist

- [ ] Affirmations techniques lues dans le CDC ou le code, pas inventées
- [ ] Hors périmètre explicite
- [ ] Recette exécutable (curl, import, écran)
- [ ] Un seul writer nommé, ou l’écart CDC assumé dans À trancher
- [ ] Titre lisible sans numéro Jira
