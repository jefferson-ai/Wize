-- Add a unique constraint to the combination of user_id and context_checksum
-- This is necessary for the .upsert() with onConflict to work correctly.
ALTER TABLE ai_advice_cache 
ADD CONSTRAINT unique_user_context_checksum UNIQUE (user_id, context_checksum);
