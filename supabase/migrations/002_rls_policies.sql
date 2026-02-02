-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_references ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Scores RLS policies
CREATE POLICY "Users can read their own scores" ON public.scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores" ON public.scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores" ON public.scores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scores" ON public.scores
  FOR DELETE USING (auth.uid() = user_id);

-- Practice Plans RLS policies
CREATE POLICY "Users can read their own practice plans" ON public.practice_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice plans" ON public.practice_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice plans" ON public.practice_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice plans" ON public.practice_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Practice Sessions RLS policies
CREATE POLICY "Users can read their own practice sessions" ON public.practice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions" ON public.practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions" ON public.practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practice sessions" ON public.practice_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- YouTube References RLS policies
CREATE POLICY "Users can read youtube references for their scores" ON public.youtube_references
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scores WHERE scores.id = youtube_references.score_id AND scores.user_id = auth.uid())
  );

CREATE POLICY "Users can insert youtube references for their scores" ON public.youtube_references
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.scores WHERE scores.id = score_id AND scores.user_id = auth.uid())
  );

CREATE POLICY "Users can delete youtube references for their scores" ON public.youtube_references
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.scores WHERE scores.id = score_id AND scores.user_id = auth.uid())
  );
