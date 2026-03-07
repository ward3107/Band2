-- Create a function to update last_login timestamp for the current user
-- This is more reliable than direct table updates as it runs with the user's auth context
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = auth.uid();
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;
