---
name: security-audit
description: >-
  Audit statique du monorepo (accès, injection SQL, fichiers, secrets, dépendances)
  et écrit un rapport. Use when the user asks for a security audit, OWASP review,
  or a check before deploy.
---

# Audit sécurité

Chaque hit de recherche est une piste. Lire le fichier avant d’en faire un finding. Lire [security-audit.md](references/security-audit.md) et lancer les recherches là-bas.

## Déroulé

1. Scope : argument, sinon `apps/api-nest`, `apps/api-matching`, `compose.yaml`, `.env.example`. Ignorer `node_modules`, `dist`, `.venv`.
2. Vérifier chaque piste : `OPEN`, `FALSE_POSITIVE` ou `ACCEPTED` (phase 1 sans JWT = accepté seulement si le rapport le dit).
3. `npm audit --audit-level=high` à la racine. Critique et high : paquet, chemin, correctif. Low : le compte suffit.
4. Écrire `docs/security/SECURITY-AUDIT-YYYY-MM-DD.md` seulement si on le demande. Sinon résumé dans le chat. Ne pas corriger sans demande.

## Gravité

Critique : injection SQL, lecture de fichier hors `storage/`, secret réel dans le dépôt. Élevée : pièce d’une autre utilisatrice une fois le JWT livré, CVE high. Moyenne : CORS ouvert, stack trace au client. Info : `/health` public, mot de passe de démo dans `.env.example` uniquement.
