-- Run this in the Supabase SQL Editor to make sure the merge columns exist
-- AND to force PostgREST to refresh its schema cache (common cause of
-- "Could not find the 'xxx' column in the schema cache" errors after ALTER TABLE).

-- 1) Ensure all merge-related columns exist
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS merged_tables TEXT;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS merged_into TEXT;

-- 2) Show the current columns so you can confirm they are present
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tables'
  AND column_name IN ('is_merged', 'merged_tables', 'merged_into')
ORDER BY column_name;

-- 3) Force PostgREST to reload the schema cache so the API sees the new columns
NOTIFY pgrst, 'reload schema';
