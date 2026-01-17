-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height DECIMAL(5,2),
  weight DECIMAL(5,2),
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')),
  dietary_preference TEXT CHECK (dietary_preference IN ('veg', 'non-veg', 'vegan')),
  allergies TEXT[],
  daily_calorie_target INTEGER DEFAULT 2000,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meals table
CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  total_calories INTEGER DEFAULT 0,
  total_protein DECIMAL(8,2) DEFAULT 0,
  total_carbs DECIMAL(8,2) DEFAULT 0,
  total_fat DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food_items table
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion_size TEXT,
  portion_grams DECIMAL(8,2),
  calories INTEGER DEFAULT 0,
  protein DECIMAL(8,2) DEFAULT 0,
  carbs DECIMAL(8,2) DEFAULT 0,
  fat DECIMAL(8,2) DEFAULT 0,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_summaries table
CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calories INTEGER DEFAULT 0,
  total_protein DECIMAL(8,2) DEFAULT 0,
  total_carbs DECIMAL(8,2) DEFAULT 0,
  total_fat DECIMAL(8,2) DEFAULT 0,
  meal_count INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Meals policies
CREATE POLICY "Users can view own meals" ON public.meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON public.meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON public.meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON public.meals FOR DELETE USING (auth.uid() = user_id);

-- Food items policies (through meals relationship)
CREATE POLICY "Users can view own food items" ON public.food_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.meals WHERE meals.id = food_items.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can insert own food items" ON public.food_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.meals WHERE meals.id = food_items.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can update own food items" ON public.food_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.meals WHERE meals.id = food_items.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can delete own food items" ON public.food_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.meals WHERE meals.id = food_items.meal_id AND meals.user_id = auth.uid()));

-- Daily summaries policies
CREATE POLICY "Users can view own summaries" ON public.daily_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON public.daily_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own summaries" ON public.daily_summaries FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update daily summary when meal is added/updated
CREATE OR REPLACE FUNCTION public.update_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meal_date DATE;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    meal_date := DATE(OLD.created_at);
    v_user_id := OLD.user_id;
  ELSE
    meal_date := DATE(NEW.created_at);
    v_user_id := NEW.user_id;
  END IF;

  INSERT INTO public.daily_summaries (user_id, date, total_calories, total_protein, total_carbs, total_fat, meal_count)
  SELECT 
    v_user_id,
    meal_date,
    COALESCE(SUM(total_calories), 0),
    COALESCE(SUM(total_protein), 0),
    COALESCE(SUM(total_carbs), 0),
    COALESCE(SUM(total_fat), 0),
    COUNT(*)
  FROM public.meals
  WHERE user_id = v_user_id AND DATE(created_at) = meal_date
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_protein = EXCLUDED.total_protein,
    total_carbs = EXCLUDED.total_carbs,
    total_fat = EXCLUDED.total_fat,
    meal_count = EXCLUDED.meal_count;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for daily summary updates
CREATE TRIGGER update_daily_summary_on_meal_insert
  AFTER INSERT ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_summary();

CREATE TRIGGER update_daily_summary_on_meal_update
  AFTER UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_summary();

CREATE TRIGGER update_daily_summary_on_meal_delete
  AFTER DELETE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_summary();