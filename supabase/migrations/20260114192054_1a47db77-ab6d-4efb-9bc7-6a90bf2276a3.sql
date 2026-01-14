-- Create role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'assistant', 'player');

-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Игрок',
  username TEXT,
  avatar_url TEXT,
  level TEXT DEFAULT 'D',
  role app_role DEFAULT 'player',
  membership_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎾',
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  location TEXT,
  city TEXT DEFAULT 'Moscow',
  level TEXT DEFAULT 'D',
  max_seats INTEGER NOT NULL DEFAULT 8,
  current_seats INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waiting', 'canceled')),
  queue_position INTEGER,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (event_id, user_id)
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID REFERENCES public.event_participants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_provider TEXT DEFAULT 'yookassa',
  external_payment_id TEXT,
  payment_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin by users table role column
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role IN ('owner', 'assistant')
  )
$$;

-- RLS Policies for users
CREATE POLICY "Anyone can read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert themselves" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update themselves" ON public.users FOR UPDATE USING (true);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can read roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (true);

-- RLS Policies for events
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update events" ON public.events FOR UPDATE USING (true);

-- RLS Policies for event_participants
CREATE POLICY "Anyone can read participants" ON public.event_participants FOR SELECT USING (true);
CREATE POLICY "Anyone can register" ON public.event_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update registration" ON public.event_participants FOR UPDATE USING (true);

-- RLS Policies for payments
CREATE POLICY "Anyone can read payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Anyone can create payments" ON public.payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update payments" ON public.payments FOR UPDATE USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some test events
INSERT INTO public.events (title, emoji, event_date, location, city, level, max_seats, price, description) VALUES
('Утренняя тренировка', '🎾', NOW() + INTERVAL '2 days', 'Padel Arena Moscow', 'Moscow', 'D+', 8, 2500, 'Тренировка для начинающих игроков уровня D+'),
('Вечерний турнир', '🏆', NOW() + INTERVAL '5 days', 'World Class Fitness', 'Moscow', 'C', 16, 3500, 'Мини-турнир для игроков среднего уровня'),
('Открытая игра', '🎯', NOW() + INTERVAL '7 days', 'Padel Club Химки', 'Moscow', 'D', 4, 1500, 'Свободная игра для всех желающих');