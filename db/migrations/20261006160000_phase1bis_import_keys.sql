-- migrate:up
-- Phase 1bis : une relance d'import reconnaît le même fichier au même jour.

CREATE TABLE item_import_keys (
  user_id uuid NOT NULL REFERENCES users (id),
  content_hash text NOT NULL,
  recorded_on date NOT NULL,
  item_id uuid NOT NULL REFERENCES items (id),
  PRIMARY KEY (user_id, content_hash, recorded_on)
);

-- migrate:down
DROP TABLE IF EXISTS item_import_keys;
