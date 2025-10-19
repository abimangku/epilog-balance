-- Function to auto-assign admin to first user
CREATE OR REPLACE FUNCTION public.assign_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM auth.users) = 1 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on auth.users
CREATE TRIGGER on_first_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_first_user_admin();

-- Manually assign admin to existing user abi@epilogcreative.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('cabb727f-233c-4edb-b6a9-eeab6b162af7', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;