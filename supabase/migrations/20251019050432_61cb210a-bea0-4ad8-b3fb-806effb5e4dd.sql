-- Create user management view function
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT,
    COALESCE(ur.role::TEXT, 'viewer') as role,
    au.created_at
  FROM auth.users au
  LEFT JOIN user_roles ur ON au.id = ur.user_id
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;