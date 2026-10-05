---
name: preparer-tests-manuels
description: >-
  Produit une feuille de cas manuels à partir du diff d’une branche ou d’une PR
  (recette, démo). Use when the user asks what to test by hand, a test sheet,
  or a manual recette before a demo.
---

# Tests manuels

Feuille de gestes, pas une revue de code. Base : argument, sinon `main`. Branche courante. Zéro commit d’avance sur la base : le dire et s’arrêter. Pas de ticket `VH-NNNN`.

## Étapes

1. `git log origin/<base>..HEAD --oneline` et `git diff origin/<base>...HEAD`.
2. Une règle = un résultat observable écrit dans le diff (rejet, code HTTP, texte, chemin retiré). L’ordre interne des appels n’est pas une règle.
3. Un cas par règle. Un résultat non écrit dans le diff va dans **Non décrit**, pas dans **Attendu**.

## Gabarit

```markdown
# Tests manuels — <branche>

**Base** : <base> · **Cas** : <N>

## Cas

### <comportement>
- **Règle** : <résultat> _(<commit ou fichier>)_
- **Où** : curl, écran, ou script
- **Faire** : <geste>
- **Attendu** : <résultat écrit dans le diff>
- **Si échec** : `<fichier de cette règle>`

## Régression
- **Règle** : <ancien comportement retiré> _(<commit ou fichier>)_
- **Faire** / **Attendu** : le nouveau résultat

## Non décrit
- <question>
```

Livrer la feuille dans le chat. Écrire `docs/recette/tests-manuels-<branche>-<date>.md` seulement si on le demande. Pas de commit.
