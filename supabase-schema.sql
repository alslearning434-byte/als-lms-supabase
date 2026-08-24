-- ALS LMS: Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run)

-- 1. Profiles (replaces PocketBase users collection)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student',
  lrn TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  employee_id TEXT DEFAULT '',
  department TEXT DEFAULT '',
  join_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Resources
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  modules JSONB DEFAULT '[]'::jsonb,
  assessment JSONB DEFAULT NULL,
  target_grade TEXT DEFAULT '',
  uploaded_by TEXT DEFAULT '',
  uploaded_at TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Module Progress
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT '',
  resource_id TEXT NOT NULL DEFAULT '',
  viewed_modules INTEGER[] DEFAULT '{}',
  last_viewed_at TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Assignment Submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL DEFAULT '',
  resource_id TEXT NOT NULL DEFAULT '',
  module_idx INTEGER DEFAULT 0,
  task_id TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  submitted_at TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Quiz Submissions
CREATE TABLE IF NOT EXISTS quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id TEXT NOT NULL DEFAULT '',
  module_idx INTEGER DEFAULT 0,
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '{}'::jsonb,
  submitted_at TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Assessment Submissions
CREATE TABLE IF NOT EXISTS assessment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id TEXT DEFAULT '',
  resource_id TEXT NOT NULL DEFAULT '',
  student_id TEXT NOT NULL DEFAULT '',
  student_name TEXT DEFAULT '',
  score INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  submitted_at TEXT DEFAULT '',
  type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'Completed',
  user_name TEXT DEFAULT '',
  action TEXT NOT NULL DEFAULT '',
  detail TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Backups
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT DEFAULT '',
  time TEXT DEFAULT '',
  type TEXT DEFAULT 'Manual',
  size TEXT DEFAULT '',
  bytes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  file_id TEXT DEFAULT '',
  doc_count INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime on all tables
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE resources;
ALTER PUBLICATION supabase_realtime ADD TABLE module_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE assessment_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE backups;

-- Row Level Security (RLS) - Allow all for now, tighten later
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON resources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON module_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON assignment_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quiz_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON assessment_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON backups FOR ALL USING (true) WITH CHECK (true);

-- Also allow anon read access for public data
CREATE POLICY "Allow anon read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON resources FOR SELECT USING (true);
CREATE POLICY "Allow anon read" ON announcements FOR SELECT USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_resource ON module_progress(resource_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student ON quiz_submissions(student_id);
CREATE POLICY "Allow anon full" ON module_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full" ON assignment_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full" ON quiz_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full" ON assessment_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full" ON backups FOR ALL USING (true) WITH CHECK (true);

-- Seed demo users (will be created as Supabase auth users separately)
-- These are just the profile records; auth accounts created via JS
