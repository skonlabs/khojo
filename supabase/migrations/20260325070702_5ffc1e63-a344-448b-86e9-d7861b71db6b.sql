
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT,
  api_key TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to read profiles for API key lookup (edge functions)
CREATE POLICY "Service role can read all profiles"
  ON public.profiles FOR SELECT
  TO service_role
  USING (true);

-- Create runs table
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  context TEXT,
  prompt TEXT,
  model TEXT,
  session_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  context_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  failure_types TEXT[] DEFAULT '{}',
  primary_failure TEXT,
  explanation TEXT,
  root_cause TEXT,
  fix TEXT,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  proof JSONB,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  evaluated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on runs
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

-- Runs RLS policies
CREATE POLICY "Users can view their own runs"
  ON public.runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own runs"
  ON public.runs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own runs"
  ON public.runs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own runs"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access for edge functions
CREATE POLICY "Service role can read all runs"
  ON public.runs FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert runs"
  ON public.runs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update runs"
  ON public.runs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, api_key)
  VALUES (NEW.id, gen_random_uuid()::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for runs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.runs;
