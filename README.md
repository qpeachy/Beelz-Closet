# Beelz' Closet

Garde-robe numérique : pièces + contexte (météo, situation, mood) → tenue recommandée.  
Stack : **Nx** · **Angular** · **NestJS** · **FastAPI** · **PostgreSQL**. Les photos ne vont pas en base.

- **[SETUP.md](SETUP.md)** — prérequis, install, lancement, Postgres, tests, dépannage
- Ci-dessous : cahier des charges

**Phase actuelle : 0** — socle technique (health + Postgres). Détail d’exécution : [SETUP.md](SETUP.md).

---

# Cahier des charges — [Beelz' Closet]

## 1. Contexte et objectifs

### 1.1 Contexte
Le projet vise à créer une application web permettant de constituer une garde-robe numérique personnelle : chaque pièce vestimentaire (haut, bas, chaussures, couvre-chef, sac, accessoire) est photographiée séparément et associée à des métriques contextuelles (météo, situation, humeur/mood). L'application recommande ensuite une **combinaison de pièces** (une tenue complète) adaptée à un contexte donné, saisi ou récupéré automatiquement.

### 1.2 Objectif principal
Permettre à l'utilisatrice, à partir d'un contexte donné (météo actuelle, situation du jour, mood), d'obtenir une **tenue complète composée automatiquement** (haut + bas + chaussures + accessoires pertinents) cohérente avec ses choix passés et harmonieuse visuellement.

### 1.3 Objectifs secondaires
- Construire un historique exploitable de correspondances contexte → tenue.
- Poser une base technique évolutive vers du machine learning (apprentissage des préférences dans le temps).
- Servir de projet portfolio démontrant une architecture full-stack (NestJS + Python + PostgreSQL) avec une forte composante data engineering.

---

## 2. Périmètre fonctionnel

### Module 1 — Enregistrement de nouvelles pièces (items)

**Description** : L'utilisatrice ajoute une pièce vestimentaire à sa garde-robe numérique, avec des métriques associées.

**Fonctionnalités :**
- Upload d'une ou plusieurs photos de pièces (formats : JPEG, PNG, WebP), une photo = une pièce.
- Saisie manuelle des métriques et attributs :
  - Catégorie (haut, bas, chaussures, couvre-chef, sac, accessoire — liste extensible)
  - Sous-catégorie pour les accessoires (parapluie, lunettes, écharpe... — liste extensible)
  - Matière (coton, lin, synthétique, laine, cuir... — liste extensible)
  - Situation (travail, sortie, sport, rendez-vous, détente, etc. — liste extensible)
  - Mood (ex : ballonnée, fatiguée, en forme, stressée — liste extensible)
  - Couleur dominante (sélection manuelle ou détection automatique, voir 3.3)
  - Commentaire libre (optionnel)
- Récupération automatique des métriques :
  - Météo au moment de l'ajout (température, condition météo, humidité) via API météo externe, à partir de la géolocalisation ou d'une ville renseignée.
  - Date et heure de l'ajout (horodatage automatique).
- Prévisualisation avant validation.
- Possibilité de modifier/supprimer une entrée après coup.
- **Mode différé (rattrapage)** : possibilité de saisir manuellement une date passée (`recorded_at`) pour une pièce déjà existante. Dans ce cas, l'appel météo automatique utilise l'**API historique d'Open-Meteo** (couverture depuis 1940) plutôt que la météo en temps réel.

**Règles de gestion :**
- Toute pièce doit avoir une catégorie et être associée à au moins une métrique manuelle (situation ou mood) pour être exploitable par l'algorithme.
- Si l'API météo est indisponible, l'utilisatrice peut saisir la météo manuellement en secours.
- Si `recorded_at` n'est pas renseigné explicitement, il est initialisé à la valeur de `created_at` (ajout "à chaud").

### Module 2 — Génération / recommandation de tenue

**Description** : L'utilisatrice décrit ou laisse le système capter son contexte actuel ; le site retourne une **combinaison de pièces** (tenue complète) adaptée à son contexte, en veillant à leur cohérence visuelle mutuelle.

**Fonctionnalités :**
- Récupération automatique de la météo actuelle (même service API que le Module 1).
- Saisie manuelle de la situation et du mood du jour (interface simple : liste déroulante / champs rapides).
- Composition automatique de la tenue :
  - Sélection du meilleur candidat par catégorie obligatoire (haut, bas, chaussures) selon le score de correspondance contextuelle.
  - Sélection optionnelle d'un ou plusieurs accessoires (couvre-chef, sac, accessoire — plusieurs accessoires possibles simultanément, ex : lunettes + parapluie) si leur score dépasse un seuil de pertinence.
  - Vérification/ajustement de la **cohérence visuelle** entre les pièces sélectionnées (couleur, matière, style) avant validation finale de la combinaison.
- Affichage de la tenue recommandée sous forme de "mood board" (toutes les pièces sélectionnées affichées ensemble).
- Affichage de combinaisons alternatives (top 2-3) si l'utilisatrice veut d'autres options.
- Possibilité de donner un feedback sur la tenue entière (👍/👎), et/ou sur une pièce spécifique de la combinaison — utile pour une v2 avec apprentissage.
- Interface de réglage des pondérations (météo / situation / mood / cohérence visuelle), avec sauvegarde des préférences par utilisatrice.

### Module 3 — Import en masse (CSV + dossier de photos)

**Description** : Permet d'importer d'un coup un backlog existant de pièces avec leurs métriques, sans passer par l'interface d'upload unitaire. Prioritaire pour le démarrage du projet.

**Fonctionnement :**
- L'utilisatrice dépose un dossier de photos + un fichier CSV décrivant les métriques associées à chaque pièce.
- Le script (côté service Python, plus adapté au traitement batch) lit le CSV, associe chaque ligne à son fichier photo, et peuple la base (`items`, `metrics`, création automatique des valeurs manquantes dans `categories`/`situations`/`moods` si besoin).

**Format du fichier CSV :**

| Colonne | Obligatoire | Exemple | Notes |
|---|---|---|---|
| `filename` | Oui | `IMG_2043.jpg` | Doit correspondre à un fichier présent dans le dossier importé |
| `category` | Oui | `haut` | Créée automatiquement dans `categories` si le label n'existe pas encore |
| `subcategory` | Non | `lunettes` | Pertinent surtout pour la catégorie `accessoire` |
| `material` | Non | `coton` | Créée automatiquement dans `materials` si le label n'existe pas encore |
| `dominant_color` | Non | `beige` | Si vide, à compléter plus tard ou détecté automatiquement (voir 3.3) |
| `recorded_at` | Oui | `2026-06-15` | Date du contexte réel, format `AAAA-MM-JJ` |
| `situation` | Oui | `travail` | Créée automatiquement dans `situations` si le label n'existe pas encore |
| `mood` | Oui | `ballonnée` | Créée automatiquement dans `moods` si le label n'existe pas encore |
| `weather_condition` | Non | `ensoleillé` | Si vide, déduit automatiquement via l'API météo historique |
| `temperature` | Non | `28` | Si vide, récupérée automatiquement via l'API météo historique |
| `latitude` | Non* | `45.7484` | *Requis si `weather_condition`/`temperature` sont vides |
| `longitude` | Non* | `4.8467` | *Idem |
| `comment` | Non | `sortie resto le soir` | Libre |

**Règles de gestion :**
- Une ligne = une pièce (item). Le script rejette (avec message d'erreur explicite) toute ligne dont le `filename` ne correspond à aucun fichier du dossier.
- Si `weather_condition`/`temperature` sont vides ET qu'aucune coordonnée n'est fournie, la ligne est importée sans données météo (à compléter manuellement plus tard).
- Un rapport d'import est généré en fin de traitement (nombre de lignes importées, erreurs, valeurs météo auto-complétées).

---

### Module 4 — Anticipation météo et recommandation sur plusieurs jours

**Description** : Permet d'anticiper une recommandation de tenues sur les jours à venir (jusqu'à 7 jours), pour un usage type "préparation de voyage".

**Fonctionnalités :**
- Sélection de la ville :
  - **Par défaut** : localisation automatique de l'utilisatrice (géolocalisation navigateur ou dernière ville connue).
  - **Manuelle** : recherche et sélection d'une autre ville (ex : préparation d'un voyage), via l'**API de géocodage d'Open-Meteo**.
- Récupération des prévisions météo à 7 jours pour la ville sélectionnée, via l'**API forecast d'Open-Meteo**.
- Pour chaque jour de la période :
  - Saisie manuelle de la situation/mood anticipés, ou réutilisation d'un mood/situation par défaut si non renseigné.
  - Composition d'une tenue complète par jour, selon le même algorithme de composition que le Module 2.
- Affichage sous forme de mini-calendrier (7 vignettes, une par jour, avec météo prévue + tenue recommandée en mood board).

**Règles de gestion :**
- Les prévisions au-delà de 7 jours ne sont pas exploitées (fiabilité météo trop faible au-delà).
- Si aucune situation/mood n'est renseigné pour un jour donné, le système utilise le mood/situation le plus fréquent de l'historique pour la saison concernée.
- La ville sélectionnée pour une anticipation n'affecte pas la ville par défaut de l'utilisatrice, sauf validation explicite ("Définir comme ma ville par défaut").

### Module 5 — Statistiques et historique

**Description** : Donne à l'utilisatrice une vue analytique de ses données accumulées (pièces, tenues, métriques) dans le temps.

**Fonctionnalités :**
- Répartition des moods par condition météo.
- Répartition des situations par saison / mois.
- Évolution temporelle des moods sur l'historique disponible (courbe ou heatmap calendaire).
- Fréquence d'utilisation de chaque pièce dans les tenues recommandées (pièces les plus/moins souvent suggérées).
- Associations de pièces les plus fréquentes (quelles pièces reviennent souvent ensemble dans une tenue).
- Filtrage des statistiques par plage de dates, ville, catégorie, ou tag (situation/mood).

**Contraintes techniques :**
- Ces statistiques sont calculées sur une **table agrégée dédiée** (voir section 3.2), rafraîchie périodiquement plutôt que recalculée à la volée, pour rester performant même avec un historique important (voir section 7).
- Le calcul d'agrégation est effectué **côté service Python** (pandas), pas dans NestJS/Sequelize — cohérence avec le reste du traitement data et centralisation de la logique analytique dans un seul service.

### Module 6 — Préférences de couleurs et cohérence visuelle

**Description** : Permet de personnaliser et calculer la cohérence visuelle des tenues composées automatiquement (Modules 2 et 4).

**Fonctionnalités :**
- **Onboarding** : à la première connexion, courte sélection des couleurs préférées de l'utilisatrice (nuancier à cocher), utilisée comme pondération légère dans le score de cohérence (sans être bloquante).
- **Détection de la couleur dominante** d'une pièce : **saisie manuelle en v1** (l'utilisatrice choisit la couleur dominante à l'ajout, via un sélecteur de couleur ou une liste de labels). La détection automatique par extraction d'image (ex : k-means sur les pixels) est repoussée en évolution future (voir 3.4), pour garder le MVP simple et éviter la complexité du traitement d'image dès le départ.
- **Moteur de cohérence visuelle** (voir détail en 3.3) : calcule si deux ou plusieurs couleurs "vont ensemble", à partir de règles de théorie des couleurs (cercle chromatique) et d'une base de référence d'associations reconnues.

---

## 3. Spécifications techniques

### 3.1 Architecture générale
- **Frontend** : Angular
- **Backend principal (API)** : NestJS — authentification, gestion des utilisatrices, upload, CRUD métadonnées, orchestration
- **Service de matching et data** : Python (FastAPI) — composition de tenues (Module 2), import en masse (Module 3), anticipation météo (Module 4), agrégations statistiques (Module 5), moteur de cohérence couleur (Module 6)
- **SQL** — langage à part entière du projet : requêtes d'agrégation, migrations et requêtes de matching complexes écrites/optimisées manuellement plutôt que systématiquement déléguées à l'ORM.
- **Base de données** : PostgreSQL — métadonnées et métriques
- **Stockage fichiers** : stockage objet (S3-compatible / Supabase Storage / Cloudinary) — jamais les photos en base
- **API externe** : [Open-Meteo](https://open-meteo.com) — gratuite, sans clé API requise
  - API **Forecast** : météo actuelle + prévisions à 7-16 jours
  - API **Historical** : données météo depuis 1940 (mode différé, import en masse)
  - API **Geocoding** : recherche de ville par nom → coordonnées

### 3.2 Modèle de données

**Table `items` (ex-`photos`)**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| url | text | URL vers le fichier stocké |
| category_id | UUID (FK) | Catégorie de la pièce |
| subcategory_id | UUID (FK, nullable) | Sous-catégorie (accessoires principalement) |
| material_id | UUID (FK, nullable) | Matière |
| dominant_color | text | Couleur dominante (hex ou label), saisie ou détectée |
| created_at | timestamp | Date d'ajout |
| deleted_at | timestamp | Nullable (soft delete) |

**Table `categories`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| name | text | `haut`, `bas`, `chaussures`, `couvre-chef`, `sac`, `accessoire` |
| slot_type | enum | `single` (une seule pièce à la fois dans la tenue) ou `multi` (plusieurs simultanément) |
| is_required | boolean | `true` pour haut/bas/chaussures, `false` pour le reste |

**Table `subcategories`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| category_id | UUID (FK) | Catégorie parente (typiquement `accessoire`) |
| name | text | `parapluie`, `lunettes`, `écharpe`... |

**Table `materials`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| name | text | `coton`, `lin`, `synthétique`, `laine`, `cuir`... |

**Table `metrics`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| item_id | UUID (FK) | Référence à la pièce, UNIQUE (relation 1-1) |
| temperature | float | Température (°C) |
| weather_condition_id | UUID (FK) | Ensoleillé, pluie, nuageux... |
| situation_id | UUID (FK) | Travail, sortie, sport... |
| mood_id | UUID (FK) | Ballonnée, fatiguée, en forme... |
| comment | text (nullable) | Commentaire libre |
| recorded_at | timestamp | Moment réel du contexte |

**Table `user_preferences`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| weight_weather | float | Poids du critère météo (0-1) |
| weight_situation | float | Poids du critère situation (0-1) |
| weight_mood | float | Poids du critère mood (0-1) |
| weight_coherence | float | Poids du critère de cohérence visuelle (0-1) |
| preferred_colors | text[] | Couleurs préférées sélectionnées à l'onboarding |
| default_city | text | Ville par défaut (nullable, sinon géolocalisation navigateur) |
| default_latitude | float | Coordonnée associée à `default_city` |
| default_longitude | float | Coordonnée associée à `default_city` |

**Table `mood_weather_stats` (table agrégée, dénormalisée pour l'analytique — Module 5)**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| period | date | Jour ou mois représenté |
| mood_id | UUID (FK) | Mood concerné |
| situation_id | UUID (FK) | Situation concernée |
| weather_condition_id | UUID (FK) | Condition météo concernée |
| avg_temperature | float | Température moyenne sur la période |
| occurrence_count | int | Nombre d'occurrences sur la période |
| computed_at | timestamp | Date de dernier recalcul de la ligne |

*Cette table est reconstruite/rafraîchie périodiquement (job planifié) à partir de `metrics`, plutôt que interrogée en direct — voir section 7.*

**Table `outfit_recommendations`**
| Champ | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| user_id | UUID | Propriétaire |
| context_snapshot | jsonb | Météo/situation/mood au moment de la génération |
| item_ids | UUID[] | Pièces composant la tenue proposée |
| coherence_score | float | Score de cohérence visuelle de la combinaison |
| feedback_rating | smallint | Nullable, 1 (👍) / -1 (👎) |
| created_at | timestamp | |

### 3.3 Algorithme de composition de tenue (v1)

**Étape 1 — Score contextuel par pièce**
- Approche par scoring pondéré (température → distance numérique, catégorielles → correspondance exacte ou proche).
- Calcul indépendant pour chaque pièce candidate, par catégorie.

**Étape 2 — Sélection par catégorie**
- Catégories obligatoires (`haut`, `bas`, `chaussures`) : sélection du meilleur candidat par score contextuel.
- Catégories optionnelles/multi (`couvre-chef`, `sac`, `accessoire`) : sélection d'un ou plusieurs candidats si leur score dépasse un seuil de pertinence (permet plusieurs accessoires simultanés, ex : lunettes + parapluie).
- Pas de test exhaustif de toutes les combinaisons possibles (évite l'explosion combinatoire) : on part du meilleur candidat par catégorie, puis on ajuste si besoin à l'étape 3.

**Étape 3 — Score de cohérence visuelle**
- Calculé entre les pièces sélectionnées à l'étape 2, à partir de :
  - **Moteur de règles colorimétriques** (théorie des couleurs, cercle chromatique en espace HSL) : détection de couleurs complémentaires, analogues, ou dissonantes entre les pièces. Calcul léger et local (bibliothèque `colorsys` en Python), sans dépendance externe.
  - **Base de référence d'associations reconnues** : jeu de données statique embarqué dans le service Python, inspiré du travail de référencement des associations de couleurs de Sanzo Wada, utilisé comme table de correspondance complémentaire à la théorie pure.
  - **Préférences personnelles** (`preferred_colors` de l'utilisatrice) appliquées comme légère pondération bonus, non bloquante.
- Si le score de cohérence est trop faible, le système reteste le deuxième meilleur candidat de la catégorie la moins contraignante contextuellement, jusqu'à obtenir une combinaison acceptable.

**Étape 4 — Pondération globale**
- Pondération des critères **ajustable par l'utilisatrice** (météo / situation / mood / cohérence visuelle), curseurs ou champs numériques. Valeurs par défaut proposées au démarrage, modifiables et sauvegardées par profil.

**Performance** : complexité négligeable jusqu'à plusieurs milliers de pièces par catégorie — pas de test combinatoire exhaustif, juste une sélection par catégorie suivie d'une vérification de cohérence sur un petit sous-ensemble de candidats. Réponse attendue en moins d'1 seconde.

### 3.4 Évolutions envisageables (hors périmètre v1)
- Apprentissage des préférences via feedback utilisateur (ML léger)
- Détection automatique d'attributs visuels plus fins (couleur dominante par traitement d'image, motif, style vestimentaire) via vision par ordinateur — la couleur dominante reste en saisie manuelle en v1
- Enrichissement du moteur de cohérence via une API de génération de palettes externe (ex : Colormind) comme source de variété supplémentaire
- Application mobile (réutilisation de l'API NestJS existante)

---

## 4. Exigences non fonctionnelles

- **Performance** : réponse de l'algorithme de composition de tenue en moins d'1 seconde pour une garde-robe allant jusqu'à 10 000 pièces.
- **Sécurité** : authentification utilisatrice (JWT), accès aux pièces restreint à la propriétaire.
- **Confidentialité** : photos et métriques strictement privées par défaut.
- **Disponibilité** : gestion des erreurs si l'API météo externe est indisponible (fallback manuel).
- **Scalabilité** : architecture microservice (Nest/Python séparés) permettant de faire évoluer indépendamment le moteur de composition.

---

## 5. Contraintes

- Stack imposée : NestJS (backend), Python/FastAPI (moteur de composition et data), SQL manuel pour les agrégations/migrations complexes, PostgreSQL, Angular (frontend).
- Projet développé en solo, à prévoir en phases incrémentales.
- Budget : privilégier des solutions gratuites/freemium pour l'hébergement et l'API météo en phase de développement.

---

## 6. Phasage du projet (proposition)

| Phase | Contenu | Objectif |
|---|---|---|
| Phase 0 | Setup monorepo (Nx), init Nest + FastAPI + PostgreSQL | Socle technique |
| Phase 1 | Module 1 : ajout de pièces (items) + saisie manuelle des métriques et attributs | MVP enregistrement |
| Phase 1bis | Module 3 : script d'import en masse (CSV + dossier photos) | Peupler la base avec le backlog existant |
| Phase 2 | Intégration API météo automatique | Enrichissement auto des métriques |
| Phase 3 | Module 2 : algorithme de composition de tenue (sélection par catégorie) | Cœur de valeur du produit |
| Phase 3bis | Module 6 : moteur de cohérence couleur + onboarding préférences | Qualité des combinaisons proposées |
| Phase 4 | Frontend Angular complet (parcours : enregistrement / recommandation) | Interface utilisateur |
| Phase 5 | Tests, ajustements de pondération, déploiement | Mise en production |
| Phase 6 | Module 4 : sélection de ville + prévisions 7 jours + recommandation anticipée | Cas d'usage "préparation de voyage" |
| Phase 7 | Module 5 : table agrégée + statistiques/historique | Valorisation data engineering |
| Phase 8 (bonus) | Feedback utilisatrice + amorce ML | Amélioration continue |

---

## 7. Renforcement data engineering (optionnel, valorisant pour un dossier Data Engineer)

Ces éléments ne sont pas indispensables au fonctionnement du produit, mais renforcent la dimension "ingénierie des données" du projet.

### 7.1 Pipeline d'import orchestré
- Découper le Module 3 (import CSV) en étapes explicites `extract` → `transform` → `load`.
- Orchestration avec un outil léger (ex : Prefect) plutôt qu'un script one-shot.
- **Idempotence** : un import relancé deux fois ne doit pas dupliquer les données (ex : clé unique sur `item_id` + `recorded_at`, ou hash de fichier).

### 7.2 Qualité de données
- Validation de schéma du CSV avec **Pydantic** avant tout chargement (types, formats de date, valeurs manquantes).
- Génération d'un **rapport de qualité** après chaque import (lignes rejetées, valeurs météo auto-complétées, doublons détectés).

### 7.3 Couche analytique dédiée
- La table `mood_weather_stats` matérialise une logique **faits/dimensions** simplifiée : `metrics` = table de faits brute, `mood_weather_stats` = agrégat pensé pour la lecture analytique.
- Rafraîchissement périodique (job planifié quotidien ou déclenché après chaque import en masse) plutôt que calcul à la volée.

### 7.4 Historisation
- Conserver un historique des changements de pondération utilisatrice (`user_preferences`) plutôt que d'écraser les valeurs — pattern proche d'une SCD (Slowly Changing Dimension) simplifiée.

### 7.5 Monitoring et logs structurés
- Logs structurés (JSON) sur chaque exécution du pipeline d'import : durée, volume traité, erreurs.
- Optionnel : petit dashboard de suivi d'exécution (Streamlit) en complément du dashboard statistiques utilisatrice (Module 5).

### 7.6 Data lineage
- Schéma documentant le flux : CSV/dossier utilisatrice → validation → enrichissement (API météo) → stockage (`items`/`metrics`) → agrégation (`mood_weather_stats`) → composition de tenue (Modules 2, 4) → restitution.

### 7.7 SQL comme compétence à part entière
- Les requêtes d'agrégation du Module 5 (`mood_weather_stats`) sont écrites en SQL manuel (agrégations `GROUP BY`, fonctions de fenêtrage si pertinent) plutôt que générées par l'ORM, pour démontrer une maîtrise directe du langage.
- Les migrations de schéma (création des tables, contraintes, index) sont revues/écrites à la main même si générées initialement par l'ORM (Sequelize/TypeORM), avec une attention particulière aux index utilisés par l'algorithme de composition (`category_id`, `situation_id`, `mood_id`, `weather_condition_id`).
- Documenter dans le README les requêtes SQL les plus significatives avec explication du plan d'exécution (`EXPLAIN ANALYZE`) — élément très valorisé en entretien Data Engineer.

---

## 8. Livrables attendus

- Code source (monorepo Nx : apps `frontend`, `api-nest`, `api-matching`)
- Documentation technique (README, schéma d'architecture, modèle de données)
- Base de données initialisée avec migrations (Sequelize ou TypeORM côté Nest)
- Application déployée (environnement de démonstration)
