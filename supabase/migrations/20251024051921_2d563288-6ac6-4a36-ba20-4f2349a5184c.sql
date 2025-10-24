-- Fix function search path security issue
DROP FUNCTION IF EXISTS update_workflows_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_workflows_timestamp
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE FUNCTION update_workflows_updated_at();