/*
  # Create Rounds and Candidates Tables

  1. New Tables
    - `rounds`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)
    - `candidates`
      - `id` (uuid, primary key)
      - `round_id` (uuid, foreign key)
      - `name` (text)
      - `letter` (text)
      - `score` (integer)
      - `color_theme` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on both tables
    - Add policies for public read/write access (since this is a shared scoreboard)
*/

CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  name text NOT NULL,
  letter text NOT NULL,
  score integer DEFAULT 0,
  color_theme text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on rounds"
  ON rounds FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on rounds"
  ON rounds FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on rounds"
  ON rounds FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on rounds"
  ON rounds FOR DELETE
  USING (true);

CREATE POLICY "Allow public read on candidates"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on candidates"
  ON candidates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on candidates"
  ON candidates FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on candidates"
  ON candidates FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS idx_candidates_round_id ON candidates(round_id);
