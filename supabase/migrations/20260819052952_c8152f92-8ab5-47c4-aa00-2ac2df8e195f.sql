CREATE TYPE public.profile_type AS ENUM ('student','woman','traveller','family','other');
CREATE TYPE public.journey_status AS ENUM ('active','completed','cancelled');
CREATE TYPE public.checkin_status AS ENUM ('pending','confirmed','missed');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  profile_type public.profile_type NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.trusted_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  notify_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_contacts TO authenticated;
GRANT ALL ON public.trusted_contacts TO service_role;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own contacts" ON public.trusted_contacts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_mode TEXT NOT NULL DEFAULT 'walking',
  planned_minutes INT NOT NULL DEFAULT 20,
  checkin_interval_minutes INT NOT NULL DEFAULT 5,
  risk_score INT,
  risk_summary TEXT,
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_source TEXT NOT NULL DEFAULT 'unassessed',
  status public.journey_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT ALL ON public.journeys TO service_role;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journeys" ON public.journeys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  status public.checkin_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.check_ins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  category TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  severity INT NOT NULL DEFAULT 2,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.safety_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_reports TO authenticated;
GRANT ALL ON public.safety_reports TO service_role;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports readable by anyone" ON public.safety_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert own report" ON public.safety_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own report" ON public.safety_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own report" ON public.safety_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  journey_id UUID REFERENCES public.journeys ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'demo_sos',
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_events TO authenticated;
GRANT ALL ON public.sos_events TO service_role;
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sos events" ON public.sos_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.safety_reports (category, note, latitude, longitude, severity, is_sample) VALUES
  ('lighting','Sample demo report: street lamps out along the park path', 28.6139, 77.2090, 3, true),
  ('crossing','Sample demo report: crossing with no signal timer', 28.6165, 77.2135, 2, true),
  ('isolated','Sample demo report: underpass feels isolated after 9pm', 28.6102, 77.2040, 3, true),
  ('crowd','Sample demo report: busy, well-lit market area', 28.6180, 77.2075, 1, true);