# Contrat — rappels produit

Noms déjà en place : champs multipart et JSON en camelCase (`dominantColor`, `recordedAt`, `weatherCondition`). Référentiels en libellés (`haut`, `travail`), résolus en id côté serveur. Pas de verbe dans l’URL (`POST /items`, pas `/createItem`).

## Idempotence de l’import

La clé ne vient pas de l’horloge du script.

- Mauvais : UUID ou `Date.now()` à chaque essai (chaque relance crée une pièce).
- Mauvais : nom de fichier seul (`IMG_2043.jpg` peut servir deux pièces).
- Retenu tant que le ticket #5 n’est pas tranché autrement : hash du fichier + `recorded_at` + utilisatrice, porté par une contrainte unique.

Deux imports concurrents du même fichier : la contrainte unique départage. Même clé, CSV différent : rejet explicite, pas la réponse du premier run.

Le job `mood_weather_stats` remplace l’agrégat de la période. Il n’additionne pas un second passage.

## Open-Meteo

Réponse tierce = entrée non fiable. Mapper le code WMO vers les cinq libellés seedés. Corps inattendu : pièce enregistrée sans météo, erreur signalée, pas un 500 qui perd la photo.
