-- Fix client table RLS policies - remove public access and tighten authenticated access
DROP POLICY IF EXISTS "Allow public read" ON public.client;
DROP POLICY IF EXISTS "Allow authenticated write" ON public.client;

-- Keep read access for authenticated users (needed for invoices, receipts, reports)
-- This policy already exists: "Allow authenticated read"

-- Add role-based write policies for client table
CREATE POLICY "Admins can insert clients"
ON public.client
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clients"
ON public.client
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clients"
ON public.client
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix settings table RLS policies - restrict write access to admins only
DROP POLICY IF EXISTS "Allow authenticated write" ON public.settings;

-- Keep read access for authenticated users (needed to read company settings)
-- This policy already exists: "Allow authenticated read"

-- Add admin-only write policies for settings table
CREATE POLICY "Admins can insert settings"
ON public.settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings"
ON public.settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));