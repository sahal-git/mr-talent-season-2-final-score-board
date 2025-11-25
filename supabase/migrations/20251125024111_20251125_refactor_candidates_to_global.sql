/*
  # Refactor Candidates to be Global (Not Tied to Rounds)

  1. Changes
    - Remove round_id foreign key from candidates table
    - Candidates are now shared across all rounds
    - Each round tracks its own scoring for the shared candidates
    
  2. New Tables
    - `round_candidate_scores` (new)
      - `id` (uuid, primary key)
      - `round_id` (uuid, foreign key to rounds)
      - `candidate_id` (uuid, foreign key to candidates)
      - `score` (integer, default 0)
      - Unique constraint on (round_id, candidate_id)
  
  3. Modified Tables
    - `candidates`
      - Remove `round_id` column
      - Remove `score` column
      - Keep name, letter, color_theme
    - `rounds`
      - Unchanged
  
  4. Security
    - Enable RLS on `round_candidate_scores`
    - Allow public access for shared scoreboard
*/

ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_round_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'round_id'
  ) THEN
    ALTER TABLE candidates DROP COLUMN round_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'score'
  ) THEN
    ALTER TABLE candidates DROP COLUMN score;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS round_candidate_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(round_id, candidate_id)
);

ALTER TABLE round_candidate_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on round_candidate_scores"
  ON round_candidate_scores FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on round_candidate_scores"
  ON round_candidate_scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on round_candidate_scores"
  ON round_candidate_scores FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on round_candidate_scores"
  ON round_candidate_scores FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_round_candidate_scores_round_id ON round_candidate_scores(round_id);
CREATE INDEX IF NOT EXISTS idx_round_candidate_scores_candidate_id ON round_candidate_scores(candidate_id);
