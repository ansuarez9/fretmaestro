-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'paid')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scores table
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  composer TEXT,
  original_file_path TEXT,
  musicxml_file_path TEXT,
  duration_seconds NUMERIC,
  instrument TEXT DEFAULT 'guitar',
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practice_plans table
CREATE TABLE IF NOT EXISTS public.practice_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score_id UUID REFERENCES public.scores(id) ON DELETE CASCADE NOT NULL,
  target_date DATE NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  daily_minutes INTEGER DEFAULT 30,
  plan_data JSONB,
  completion_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score_id UUID REFERENCES public.scores(id) ON DELETE CASCADE,
  practice_plan_id UUID REFERENCES public.practice_plans(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  accuracy_percentage NUMERIC,
  notes_played INTEGER,
  notes_correct INTEGER,
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create youtube_references table
CREATE TABLE IF NOT EXISTS public.youtube_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id UUID REFERENCES public.scores(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  relevance_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(score_id, video_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON public.scores(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_plans_user_id ON public.practice_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_plans_score_id ON public.practice_plans(score_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_score_id ON public.practice_sessions(score_id);
CREATE INDEX IF NOT EXISTS idx_youtube_references_score_id ON public.youtube_references(score_id);
