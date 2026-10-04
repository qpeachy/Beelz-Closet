-- migrate:up
-- Phase 1 : enregistrer une pièce et son contexte. Pas de reco, pas de stats.

CREATE TYPE slot_type AS ENUM ('single', 'multi');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slot_type slot_type NOT NULL,
  is_required boolean NOT NULL
);

CREATE TABLE subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories (id),
  name text NOT NULL,
  UNIQUE (category_id, name),
  UNIQUE (id, category_id)
);

CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE situations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE weather_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id),
  url text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories (id),
  subcategory_id uuid,
  material_id uuid REFERENCES materials (id),
  dominant_color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT items_subcategory_category_fk
    FOREIGN KEY (subcategory_id, category_id)
    REFERENCES subcategories (id, category_id)
);

CREATE INDEX items_category_id_idx ON items (category_id);
CREATE INDEX items_user_active_idx ON items (user_id) WHERE deleted_at IS NULL;

CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL UNIQUE REFERENCES items (id),
  temperature double precision,
  weather_condition_id uuid REFERENCES weather_conditions (id),
  situation_id uuid REFERENCES situations (id),
  mood_id uuid REFERENCES moods (id),
  comment text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT metrics_situation_or_mood CHECK (
    situation_id IS NOT NULL OR mood_id IS NOT NULL
  )
);

CREATE INDEX metrics_situation_id_idx ON metrics (situation_id);
CREATE INDEX metrics_mood_id_idx ON metrics (mood_id);
CREATE INDEX metrics_weather_condition_id_idx ON metrics (weather_condition_id);

INSERT INTO users (id, display_name)
VALUES ('a0000000-0000-4000-8000-000000000001', 'locale');

INSERT INTO categories (name, slot_type, is_required) VALUES
  ('haut', 'single', true),
  ('bas', 'single', true),
  ('chaussures', 'single', true),
  ('couvre-chef', 'single', false),
  ('sac', 'single', false),
  ('accessoire', 'multi', false);

INSERT INTO subcategories (category_id, name)
SELECT c.id, sub.name
FROM categories c
CROSS JOIN (VALUES ('parapluie'), ('lunettes'), ('écharpe')) AS sub(name)
WHERE c.name = 'accessoire';

INSERT INTO materials (name) VALUES
  ('coton'), ('lin'), ('synthétique'), ('laine'), ('cuir');

INSERT INTO situations (name) VALUES
  ('travail'), ('sortie'), ('sport'), ('rendez-vous'), ('détente');

INSERT INTO moods (name) VALUES
  ('ballonnée'), ('fatiguée'), ('en forme'), ('stressée');

INSERT INTO weather_conditions (name) VALUES
  ('ensoleillé'), ('pluie'), ('nuageux'), ('venteux'), ('neige');

-- migrate:down
DROP TABLE IF EXISTS metrics;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS subcategories;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS situations;
DROP TABLE IF EXISTS moods;
DROP TABLE IF EXISTS weather_conditions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS slot_type;
