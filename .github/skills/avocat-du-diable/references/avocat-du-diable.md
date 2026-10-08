# Angles morts — Beelz' Closet

Garder seulement ce qui casse le produit ou la donnée. Prototype local : alléger. Démo ou phase data (1bis, 2, 3, 7) : serrer.

| Angle | Question |
| --- | --- |
| Phase | Est-ce que le diff implémente N+1 (météo, reco, UI) pendant la phase en cours ? |
| Writer | Nest et FastAPI écrivent-ils la même table avec deux règles ? Les CHECK et FK suffisent-ils ? |
| Idempotence | Relancer l’import ou le job d’agrégat double-t-il des lignes ? La clé change-t-elle entre deux essais du même fichier ? |
| Cycle de vie | Une pièce `deleted_at` reste-t-elle dans le score, l’agrégat ou les fichiers sur disque ? |
| Photo | Le chemin fichier vient-il du client (`../`) ? L’URL en base pointe-t-elle hors de `storage/` ? |
| Météo | Open-Meteo down ou lieu absent : la pièce est-elle refusée, ou enregistrée sans météo et signalée ? |
| Contrat | Le 400 Nest et l’erreur FastAPI ont-ils la même forme ? Un libellé inconnu crée-t-il un lookup d’un côté et un rejet de l’autre ? |
| Auth | `x-user-id` permet-il de lire les pièces d’une autre utilisatrice ? (acceptable en phase 1, bloquant dès la phase 4) |
| SQL | La requête de matching ou d’agrégat a-t-elle un `EXPLAIN` avant de promettre moins d’une seconde ? |
| Secret | Un mot de passe, un `.env` ou une photo est-il dans le diff ? |
