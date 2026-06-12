/*
# Add shifts table for weekly schedule

- `shifts`: Stores scheduled shifts for employees
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - user_name (text, denormalized for display)
  - shift_date (date)
  - start_time (time)
  - end_time (time)
  - role_label (text, optional - e.g. "Kitchen", "Front of House")
  - created_at (timestamp)
*/

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role_label text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Shifts policies (anon access for PIN-based app)
DROP POLICY IF EXISTS "anon_select_shifts" ON shifts;
CREATE POLICY "anon_select_shifts" ON shifts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shifts" ON shifts;
CREATE POLICY "anon_insert_shifts" ON shifts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shifts" ON shifts;
CREATE POLICY "anon_update_shifts" ON shifts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shifts" ON shifts;
CREATE POLICY "anon_delete_shifts" ON shifts FOR DELETE
  TO anon, authenticated USING (true);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_date ON shifts(shift_date);