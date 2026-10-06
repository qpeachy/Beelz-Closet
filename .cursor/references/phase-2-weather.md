---
description: Phase 2 — Open-Meteo. Lire avant de toucher la météo automatique.
---

# Phase 2 — météo

Un seul client, dans FastAPI (`weather.py`). Nest l'appelle via `POST /weather`. L'import l'appelle en process si le CSV a des coordonnées et pas de météo.

## Fait

- Aujourd'hui : API forecast. Passé : API archive. Futur : ignoré.
- Code WMO → `ensoleillé`, `nuageux`, `pluie`, `neige`. Vent ≥ 40 km/h sur un code sec → `venteux`.
- API down : la pièce reste enregistrée, météo vide.

## Hors scope

Prévision 7 jours, ville par défaut du profil, UI.
