-- Create a table for caching AI advice
CREATE TABLE IF NOT EXISTS ai_advice_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advice JSONB NOT NULL,
  context_checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by user and checksum
CREATE INDEX IF NOT EXISTS idx_ai_advice_cache_user_checksum ON ai_advice_cache (user_id, context_checksum);

-- Enable RLS
ALTER TABLE ai_advice_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cache
CREATE POLICY "Users can view own AI cache" 
ON ai_advice_cache FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Service role can manage everything (needed for Edge Function)
CREATE POLICY "Service role can manage AI cache" 
ON ai_advice_cache FOR ALL 
TO service_role 
USING (true);
