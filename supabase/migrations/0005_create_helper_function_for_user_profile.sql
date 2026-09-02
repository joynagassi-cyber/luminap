
-- Create the admin user in auth.users (this will be done via the Supabase Auth API)
-- For now, we'll handle user creation through the login page using Supabase auth.signUp

-- Create a helper function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  org_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.org_id
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;
