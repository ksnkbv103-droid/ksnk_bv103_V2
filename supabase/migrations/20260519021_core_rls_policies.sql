-- Core RLS policies for clean schema

-- Enable RLS
ALTER TABLE dm_khoa_phong ENABLE ROW LEVEL SECURITY;

-- Example RLS policies
CREATE POLICY "Authenticated users can read dm_khoa_phong" ON dm_khoa_phong FOR SELECT TO authenticated USING (true);

-- Similar for other tables
