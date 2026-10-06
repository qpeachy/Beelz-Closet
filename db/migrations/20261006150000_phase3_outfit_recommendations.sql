-- migrate:up
-- Phase 3 : persister une tenue proposée. Pas de score de cohérence, pas de feedback.

CREATE TABLE outfit_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id),
  context_snapshot jsonb NOT NULL,
  item_ids uuid[] NOT NULL,
  coherence_score double precision,
  feedback_rating smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outfit_recommendations_feedback_check CHECK (
    feedback_rating IS NULL OR feedback_rating IN (-1, 1)
  )
);

CREATE INDEX outfit_recommendations_user_created_idx
  ON outfit_recommendations (user_id, created_at DESC);

-- migrate:down
DROP TABLE IF EXISTS outfit_recommendations;
