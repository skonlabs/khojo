
-- Create projects table for multi-project support
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  api_key text NOT NULL UNIQUE DEFAULT (gen_random_uuid())::text,
  monitoring_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all projects" ON public.projects FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update projects" ON public.projects FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Add project_id to runs (nullable for migration, existing runs will be updated)
ALTER TABLE public.runs ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create feedback table
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'bug',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert feedback" ON public.feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can read all feedback" ON public.feedback FOR SELECT TO service_role USING (true);

-- Migrate existing data: create a project for each profile
INSERT INTO public.projects (user_id, name, api_key)
SELECT p.id, COALESCE(p.project_name, 'Default Project'), p.api_key
FROM public.profiles p;

-- Link existing runs to their user's project
UPDATE public.runs r SET project_id = (
  SELECT proj.id FROM public.projects proj WHERE proj.user_id = r.user_id LIMIT 1
);
