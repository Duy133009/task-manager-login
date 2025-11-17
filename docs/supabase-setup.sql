-- ============================================
-- Supabase Setup Script
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- 1. BẬT EMAIL/PASSWORD AUTH
-- Vào Authentication → Settings → Email/Password → Enable

-- 2. RLS POLICIES CHO BẢNG users
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own data (via trigger)
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 3. RLS POLICIES CHO BẢNG tasks
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read accessible tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Users can read tasks they own, are assigned to, or subscribed to
CREATE POLICY "Users can read accessible tasks" ON tasks
  FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    assigned_to = auth.uid() OR
    id IN (
      SELECT task_id 
      FROM task_subscriptions 
      WHERE user_id = auth.uid()
    )
  );

-- Only owners can insert tasks
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Only owners can update tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Only owners can delete tasks
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE 
  USING (user_id = auth.uid());

-- 4. RLS POLICIES CHO BẢNG task_subscriptions
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON task_subscriptions;

CREATE POLICY "Users can manage own subscriptions" ON task_subscriptions
  FOR ALL 
  USING (user_id = auth.uid());

-- 5. RLS POLICIES CHO BẢNG user_sessions (nếu còn dùng)
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can access own sessions" ON user_sessions;

CREATE POLICY "Users can access own sessions" ON user_sessions
  FOR ALL 
  USING (user_id = auth.uid());

-- 6. DATABASE TRIGGER - Tự động tạo user profile khi sign up
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    username, 
    full_name,
    email_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'username', 
      split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. FUNCTION - Update user profile when auth user is updated
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET 
    email = NEW.email,
    email_verified = (NEW.email_confirmed_at IS NOT NULL),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.email IS DISTINCT FROM NEW.email OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  EXECUTE FUNCTION public.handle_user_update();

-- 8. ENABLE RLS ON TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 9. VERIFY SETUP
-- ============================================

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tasks', 'task_subscriptions', 'user_sessions');

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'tasks', 'task_subscriptions', 'user_sessions')
ORDER BY tablename, policyname;

