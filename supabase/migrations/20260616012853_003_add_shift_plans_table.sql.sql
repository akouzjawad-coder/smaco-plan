/*
# Add shift_plans table for PDF shift plans

- `shift_plans`: Stores uploaded PDF shift plans
  - id (uuid, primary key)
  - file_name (text)
  - file_data (text - base64 encoded PDF)
  - uploaded_by (text - user name)
  - created_at (timestamp)
*/

CREATE TABLE IF NOT EXISTS shift_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_data text NOT NULL,
  uploaded_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shift_plans ENABLE ROW LEVEL SECURITY;

-- Shift plans policies (anon access for PIN-based app)
DROP POLICY IF EXISTS "anon_select_shift_plans" ON shift_plans;
CREATE POLICY "anon_select_shift_plans" ON shift_plans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shift_plans" ON shift_plans;
CREATE POLICY "anon_insert_shift_plans" ON shift_plans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shift_plans" ON shift_plans;
CREATE POLICY "anon_update_shift_plans" ON shift_plans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shift_plans" ON shift_plans;
CREATE POLICY "anon_delete_shift_plans" ON shift_plans FOR DELETE
  TO anon, authenticated USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_shift_plans_created_at ON shift_plans(created_at);