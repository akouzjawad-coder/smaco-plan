/*
# Create initial schema for SMACO Plan

1. New Tables
- `profiles`: Stores employee and manager information
  - id (uuid, primary key)
  - name (text, not null)
  - phone (text)
  - role (text: 'boss' or 'employee')
  - hourly_rate (numeric, default 13.00)
  - avatar (text, optional URL)
  - pin (text, 4-digit PIN for login)
  - created_at (timestamp)
  
- `work_records`: Stores submitted work hours
  - id (uuid, primary key)
  - user_id (uuid, references profiles)
  - user_name (text, denormalized for display)
  - work_date (date)
  - start_time (time)
  - end_time (time)
  - total_hours (numeric, calculated)
  - hourly_rate (numeric, rate at time of submission)
  - earnings (numeric, calculated)
  - notes (text, optional)
  - is_paid (boolean, default false)
  - is_approved (boolean, default false)
  - created_at (timestamp)

2. Security
- Enable RLS on all tables
- Allow anon + authenticated CRUD (single-tenant PIN-based app)
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('boss', 'employee')),
  hourly_rate numeric NOT NULL DEFAULT 13.00,
  avatar text DEFAULT '',
  pin text NOT NULL DEFAULT '0000',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  work_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 13.00,
  earnings numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  is_paid boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;

-- Profiles policies (anon access for PIN-based app)
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE
  TO anon, authenticated USING (true);

-- Work records policies (anon access for PIN-based app)
DROP POLICY IF EXISTS "anon_select_work_records" ON work_records;
CREATE POLICY "anon_select_work_records" ON work_records FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_work_records" ON work_records;
CREATE POLICY "anon_insert_work_records" ON work_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_work_records" ON work_records;
CREATE POLICY "anon_update_work_records" ON work_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_work_records" ON work_records;
CREATE POLICY "anon_delete_work_records" ON work_records FOR DELETE
  TO anon, authenticated USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_work_records_user_id ON work_records(user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_work_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
