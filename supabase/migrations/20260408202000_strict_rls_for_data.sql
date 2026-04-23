-- Security Hardening: Enforce Row Level Security on all core financial tables
-- Prevents exposing or tampering with data from other users via the PostgREST API and Edge Functions.

-- 1. Enable RLS for all mapped client tables
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.challenges ENABLE ROW LEVEL SECURITY;

-- 2. Define Strict Policies for Authenticated Operations

-- Categories
CREATE POLICY "Users can manage own categories" ON public.categories
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Accounts
CREATE POLICY "Users can manage own accounts" ON public.accounts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Transactions
CREATE POLICY "Users can manage own transactions" ON public.transactions
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Budgets
CREATE POLICY "Users can manage own budgets" ON public.budgets
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Saving Goals
CREATE POLICY "Users can manage own saving_goals" ON public.saving_goals
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Challenges
CREATE POLICY "Users can manage own challenges" ON public.challenges
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);
