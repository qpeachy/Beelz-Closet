# Cahier des charges — [Beelz' Closet]

## 1. Contexte et objectifs

### 1.1 Contexte
Le projet vise à créer une application web permettant de constituer une base de données personnelle de photos associées à des métriques contextuelles (météo, situation, humeur/mood), puis de recommander automatiquement la photo la plus adaptée à un contexte donné, saisi ou récupéré automatiquement.

### 1.2 Objectif principal
Permettre à l'utilisateur, à partir d'un contexte donné (météo actuelle, situation du jour, mood), d'obtenir une suggestion visuelle (photo) cohérente avec des choix passés similaires — par exemple, pour l'aider à choisir une tenue adaptée au contexte du jour.

### 1.3 Objectifs secondaires
- Construire un historique exploitable de correspondances contexte → photo.
- Poser une base technique évolutive vers du machine learning (apprentissage des préférences dans le temps).
- Servir de projet portfolio démontrant une architecture full-stack (NestJS + Python + PostgreSQL).

---

## 2. Périmètre fonctionnel

### Module 1 — Enregistrement de nouvelles photos

**Description** : L'utilisateur ajoute une photo à sa base personnelle, avec des métriques associées.

**Fonctionnalités :**
- Upload d'une ou plusieurs photos (formats : JPEG, PNG, WebP).
- Saisie manuelle des métriques :
  - Situation (travail, sortie, sport, rendez-vous, détente, etc. — liste extensible)
  - Mood (ex : ballonnée, fatiguée, en forme, stressée — liste extensible)
  - Commentaire libre (optionnel)
- Récupération automatique des métriques :
  - Météo au moment de l'upload (température, condition météo, humidité) via API météo externe, à partir de la géolocalisation ou d'une ville renseignée.
  - Date et heure de l'ajout (horodatage automatique).
- Prévisualisation avant validation.
- Possibilité de modifier/supprimer une entrée après coup.
- **Mode différé (rattrapage)** : possibilité de saisir manuellement une date passée (`recorded_at`) pour une photo déjà existante. Dans ce cas, l'appel météo automatique utilise l'**API historique d'Open-Meteo** (couverture depuis 1940) plutôt que la météo en temps réel, afin de retrouver les conditions du jour concerné.

**Règles de gestion :**
- Toute photo doit être associée à au moins une métrique manuelle (situation ou mood) pour être exploitable par l'algorithme.
- Si l'API météo est indisponible, l'utilisateur peut saisir la météo manuellement en secours.
- Si `recorded_at` n'est pas renseigné explicitement par l'utilisateur, il est initialisé à la valeur de `created_at` (upload "à chaud").

### Module 2 — Génération / recommandation de photo

**Description** : L'utilisateur décrit ou laisse le système capter son contexte actuel ; le site retourne la photo la plus adaptée de sa base.

**Fonctionnalités :**
- Récupération automatique de la météo actuelle (même service API que le module 1).
- Saisie manuelle de la situation et du mood du jour (interface simple : liste déroulante / champs rapides).
- Calcul et affichage de la photo recommandée (meilleur score de correspondance).
- Affichage de résultats alternatifs (top 3-5) si l'utilisateur veut d'autres options.
- Possibilité de donner un feedback sur la suggestion (👍/👎) — utile pour une v2 avec apprentissage.
- Interface de réglage des pondérations (météo / situation / mood), avec sauvegarde des préférences par utilisateur.

### Module 3 — Import en masse (CSV + dossier de photos)

**Description** : Permet d'importer d'un coup un backlog existant de photos avec leurs métriques, sans passer par l'interface d'upload unitaire. Prioritaire pour le démarrage du projet, puisque l'utilisatrice dispose déjà de photos antérieures à l'existence de l'application.

**Fonctionnement :**
- L'utilisateur dépose un dossier de photos + un fichier CSV décrivant les métriques associées à chaque photo.
- Le script (côté service Python, plus adapté au traitement batch) lit le CSV, associe chaque ligne à son fichier photo, et peuple la base (`photos`, `metrics`, création automatique des valeurs manquantes dans `situations`/`moods` si besoin).

**Format du fichier CSV :**

| Colonne | Obligatoire | Exemple | Notes |
|---|---|---|---|
| `filename` | Oui | `IMG_2043.jpg` | Doit correspondre à un fichier présent dans le dossier importé |
| `recorded_at` | Oui | `2026-06-15` | Date du contexte réel, format `AAAA-MM-JJ` |
| `situation` | Oui | `travail` | Créé automatiquement dans la table `situations` si le label n'existe pas encore |
| `mood` | Oui | `ballonnée` | Créé automatiquement dans la table `moods` si le label n'existe pas encore |
| `weather_condition` | Non | `ensoleillé` | Si vide, déduit automatiquement via l'API météo historique |
| `temperature` | Non | `28` | Si vide, récupérée automatiquement via l'API météo historique |
| `latitude` | Non* | `45.7484` | *Requis si `weather_condition`/`temperature` sont vides, pour l'appel à l'API historique |
| `longitude` | Non* | `4.8467` | *Idem |
| `comment` | Non | `sortie resto le soir` | Libre |

**Règles de gestion :**
- Une ligne = une photo. Le script rejette (avec message d'erreur explicite) toute ligne dont le `filename` ne correspond à aucun fichier du dossier.
- Si `weather_condition`/`temperature` sont vides ET qu'aucune coordonnée n'est fournie, la ligne est importée sans données météo (à compléter manuellement plus tard).
- Un rapport d'import est généré en fin de traitement (nombre de lignes importées, erreurs, valeurs météo auto-complétées).

---

### Module 4 — Anticipation météo et recommandation sur plusieurs jours

**Description** : Permet d'anticiper une recommandation sur les jours à venir (jusqu'à 7 jours), pour un usage type "préparation de voyage" — l'utilisateur veut savoir quoi emporter selon la météo prévue à destination.

**Fonctionnalités :**
- Sélection de la ville :
  - **Par défaut** : localisation automatique de l'utilisateur (géolocalisation navigateur ou dernière ville connue).
  - **Manuelle** : recherche et sélection d'une autre ville (ex : préparation d'un voyage), via l'**API de géocodage d'Open-Meteo** (recherche par nom de ville → coordonnées).
- Récupération des prévisions météo à 7 jours pour la ville sélectionnée, via l'**API forecast d'Open-Meteo**.
- Pour chaque jour de la période :
  - Saisie manuelle de la situation/mood anticipés (ex : "voyage — visite touristique", "voyage — plage"), ou réutilisation d'un mood/situation par défaut si non renseigné.
  - Calcul d'une recommandation de photo par jour, selon le même algorithme de scoring que le Module 2.
- Affichage sous forme de mini-calendrier (7 vignettes, une par jour, avec météo prévue + photo recommandée).

**Règles de gestion :**
- Les prévisions au-delà de 7 jours ne sont pas exploitées (fiabilité météo trop faible au-delà).
- Si aucune situation/mood n'est renseigné pour un jour donné, le système utilise le mood/situation le plus fréquent de l'historique de l'utilisateur pour la saison concernée.
- La ville sélectionnée pour une anticipation n'affecte pas la ville par défaut de l'utilisateur, sauf validation explicite ("Définir comme ma ville par défaut").

### Module 5 — Statistiques et historique

**Description** : Donne à l'utilisateur une vue analytique de ses propres données accumulées (photos, métriques) dans le temps.

**Fonctionnalités :**
- Répartition des moods par condition météo (ex : "je me sens ballonnée principalement quand il fait > 25°C").
- Répartition des situations par saison / mois.
- Évolution temporelle des moods sur l'historique disponible (courbe ou heatmap calendaire).
- Fréquence d'utilisation de chaque photo comme recommandation (photos les plus/moins souvent suggérées).
- Filtrage des statistiques par plage de dates, ville, ou tag (situation/mood).

**Contraintes techniques :**
- Ces statistiques sont calculées sur une **table agrégée dédiée** (voir section 3.2), rafraîchie périodiquement plutôt que recalculée à la volée à chaque affichage, pour rester performant même avec un historique important (voir section 7 pour le détail du mécanisme de rafraîchissement).
- Le calcul d'agrégation est effectué **côté service Python** (pandas), pas dans NestJS/Sequelize — cohérence avec le reste du traitement data (Modules 3 et 4) et centralisation de la logique analytique dans un seul service.

## 3. Spécifications techniques

### 3.1 Architecture générale
- **Frontend** : Angular (cohérent avec l'écosystème déjà maîtrisé)
- **Backend principal (API)** : NestJS — authentification, gestion des utilisateurs, upload, CRUD métadonnées, orchestration
- **Service de matching et data** : Python (FastAPI) — calcul du score de similarité contexte/photo (Module 2), import en masse (Module 3), anticipation météo (Module 4), agrégations statistiques (Module 5)
- **SQL** — langage à part entière du projet, pas seulement via ORM : les requêtes d'agrégation (Module 5), les migrations, et les requêtes de matching complexes sont écrites/optimisées manuellement plutôt que systématiquement déléguées à Sequelize/TypeORM. Objectif : démontrer une maîtrise directe du SQL (jointures, fenêtrage, index), compétence clé en Data Engineering.
- **Base de données** : PostgreSQL — métadonnées et métriques
- **Stockage fichiers** : stockage objet (S3-compatible / Supabase Storage / Cloudinary) — jamais les photos en base
- **API externe** : [Open-Meteo](https://open-meteo.com) — gratuite, sans clé API requise, résolution 2-11 km, sélection automatique du meilleur modèle météo selon la localisation
  - API **Forecast** : météo actuelle + prévisions à 7-16 jours
  - API **Historical** : données météo depuis 1940 (pour le mode différé du Module 1 et l'import en masse)
  - API **Geocoding** : recherche de ville par nom → coordonnées (pour la sélection manuelle de ville, Module 4)

### 3.2 Modèle de données (simplifié)

**Table `photos`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| url | text | URL vers le fichier stocké |
| user_id | UUID | Propriétaire |
| created_at | timestamp | Date d'ajout |

**Table `user_preferences`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| weight_weather | float | Poids du critère météo (0-1) |
| weight_situation | float | Poids du critère situation (0-1) |
| weight_mood | float | Poids du critère mood (0-1) |
| default_city | text | Nom de la ville par défaut (nullable, sinon géolocalisation navigateur) |
| default_latitude | float | Coordonnée associée à `default_city` |
| default_longitude | float | Coordonnée associée à `default_city` |

**Table `mood_weather_stats` (table agrégée, dénormalisée pour l'analytique — Module 5)**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| period | date | Jour ou mois représenté (selon granularité choisie) |
| mood_id | UUID (FK) | Mood concerné |
| situation_id | UUID (FK) | Situation concernée |
| weather_condition_id | UUID (FK) | Condition météo concernée |
| avg_temperature | float | Température moyenne sur la période |
| occurrence_count | int | Nombre d'occurrences sur la période |
| computed_at | timestamp | Date de dernier recalcul de la ligne |

*Cette table est reconstruite/rafraîchie périodiquement (job planifié) à partir de `metrics`, plutôt que interrogée en direct — voir section 7.*

**Table `metrics`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| photo_id | UUID (FK) | Référence à la photo |
| temperature | float | Température (°C) |
| weather_condition | enum/text | Ensoleillé, pluie, nuageux... |
| situation | enum/text | Travail, sortie, sport... |
| mood | enum/text | Ballonnée, fatiguée, en forme... |
| comment | text (nullable) | Commentaire libre |

### 3.3 Algorithme de matching (v1)
- Approche par **scoring pondéré** (pas de ML nécessaire au démarrage) :
  - Normalisation des métriques (température → distance numérique, catégorielles → correspondance exacte ou proche)
  - Calcul d'un score de similarité (ex : distance euclidienne pondérée ou cosine similarity)
  - Retour de la photo au meilleur score
- Pondération des critères **ajustable par l'utilisateur** (ex : curseurs ou champs numériques pour donner plus de poids au mood qu'à la météo). Valeurs par défaut proposées au démarrage, modifiables et sauvegardées par profil utilisateur.
- Complexité négligeable jusqu'à plusieurs dizaines de milliers de photos ; pas d'index vectoriel nécessaire à ce stade (envisageable plus tard avec `pgvector` si évolution vers des embeddings)

### 3.4 Évolutions envisageables (hors périmètre v1)
- Apprentissage des préférences via feedback utilisateur (ML léger)
- Reconnaissance automatique d'attributs visuels sur la photo (couleur dominante, style vestimentaire) via vision par ordinateur
- Application mobile (réutilisation de l'API NestJS existante)

---

## 4. Exigences non fonctionnelles

- **Performance** : réponse de l'algorithme de recommandation en moins d'1 seconde pour une base allant jusqu'à 10 000 photos.
- **Sécurité** : authentification utilisateur (JWT), accès aux photos restreint au propriétaire.
- **Confidentialité** : photos et métriques strictement privées par défaut.
- **Disponibilité** : gestion des erreurs si l'API météo externe est indisponible (fallback manuel).
- **Scalabilité** : architecture microservice (Nest/Python séparés) permettant de faire évoluer indépendamment le moteur de matching.

---

## 5. Contraintes

- Stack imposée : NestJS (backend), Python/FastAPI (moteur de matching et data), SQL manuel pour les agrégations/migrations complexes, PostgreSQL, Angular (frontend).
- Projet développé en solo, à prévoir en phases incrémentales.
- Budget : privilégier des solutions gratuites/freemium pour l'hébergement et l'API météo en phase de développement.

---

## 6. Phasage du projet (proposition)

| Phase | Contenu | Objectif |
|---|---|---|
| Phase 0 | Setup monorepo (Nx), init Nest + FastAPI + PostgreSQL | Socle technique |
| Phase 1 | Module 1 : upload photo + saisie manuelle des métriques | MVP enregistrement |
| Phase 1bis | Module 3 : script d'import en masse (CSV + dossier photos) | Peupler la base avec le backlog existant |
| Phase 2 | Intégration API météo automatique | Enrichissement auto des métriques |
| Phase 3 | Module 2 : algorithme de matching + endpoint de recommandation | Cœur de valeur du produit |
| Phase 4 | Frontend Angular complet (deux parcours : enregistrement / recommandation) | Interface utilisateur |
| Phase 5 | Tests, ajustements de pondération, déploiement | Mise en production |
| Phase 6 | Module 4 : sélection de ville + prévisions 7 jours + recommandation anticipée | Cas d'usage "préparation de voyage" |
| Phase 7 | Module 5 : table agrégée + statistiques/historique | Valorisation data engineering |
| Phase 8 (bonus) | Feedback utilisateur + amorce ML | Amélioration continue |

---

## 7. Renforcement data engineering (optionnel, valorisant pour un dossier Data Engineer)

Ces éléments ne sont pas indispensables au fonctionnement du produit, mais renforcent la dimension "ingénierie des données" du projet — pertinent si le projet est présenté dans le cadre d'une recherche de stage/alternance Data Engineer.

### 7.1 Pipeline d'import orchestré
- Découper le Module 3 (import CSV) en étapes explicites `extract` → `transform` → `load`.
- Orchestration avec un outil léger (ex : Prefect) plutôt qu'un script one-shot.
- **Idempotence** : un import relancé deux fois ne doit pas dupliquer les données (ex : clé unique sur `photo_id` + `recorded_at`, ou hash de fichier).

### 7.2 Qualité de données
- Validation de schéma du CSV avec **Pydantic** avant tout chargement (types, formats de date, valeurs manquantes).
- Génération d'un **rapport de qualité** après chaque import (lignes rejetées, valeurs météo auto-complétées, doublons détectés).

### 7.3 Couche analytique dédiée
- La table `mood_weather_stats` (section 3.2) matérialise une logique **faits/dimensions** simplifiée : `metrics` = table de faits brute, `mood_weather_stats` = agrégat pensé pour la lecture analytique.
- Rafraîchissement périodique (job planifié quotidien ou déclenché après chaque import en masse) plutôt que calcul à la volée.

### 7.4 Historisation
- Conserver un historique des changements de pondération utilisateur (`user_preferences`) plutôt que d'écraser les valeurs — pattern proche d'une SCD (Slowly Changing Dimension) simplifiée.

### 7.5 Monitoring et logs structurés
- Logs structurés (JSON) sur chaque exécution du pipeline d'import : durée, volume traité, erreurs.
- Optionnel : petit dashboard de suivi d'exécution (Streamlit) en complément du dashboard statistiques utilisateur (Module 5).

### 7.6 Data lineage
- Schéma documentant le flux : CSV/dossier utilisateur → validation → enrichissement (API météo) → stockage (`photos`/`metrics`) → agrégation (`mood_weather_stats`) → restitution (Modules 2, 4, 5).

### 7.7 SQL comme compétence à part entière
- Les requêtes d'agrégation du Module 5 (`mood_weather_stats`) sont écrites en SQL manuel (agrégations `GROUP BY`, fonctions de fenêtrage si pertinent) plutôt que générées par l'ORM, pour démontrer une maîtrise directe du langage.
- Les migrations de schéma (création des tables, contraintes, index) sont revues/écrites à la main même si générées initialement par l'ORM (Sequelize/TypeORM), avec une attention particulière aux index utilisés par l'algorithme de matching (`situation_id`, `mood_id`, `weather_condition_id`).
- Documenter dans le README les requêtes SQL les plus significatives (ex : requête d'agrégation mensuelle par mood/météo) avec explication du plan d'exécution (`EXPLAIN ANALYZE`) — élément très valorisé en entretien Data Engineer.

---

## 8. Livrables attendus

- Code source (monorepo Nx : apps `frontend`, `api-nest`, `api-matching`)
- Documentation technique (README, schéma d'architecture, modèle de données)
- Base de données initialisée avec migrations (Sequelize ou TypeORM côté Nest)
- Application déployée (environnement de démonstration)
