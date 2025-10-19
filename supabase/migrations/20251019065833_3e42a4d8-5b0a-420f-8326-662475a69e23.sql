-- Enable RLS on bank_account table
ALTER TABLE public.bank_account ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view bank accounts (needed for dropdowns in forms)
CREATE POLICY "Authenticated users can view bank accounts"
ON public.bank_account
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert bank accounts
CREATE POLICY "Admins can create bank accounts"
ON public.bank_account
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update bank accounts
CREATE POLICY "Admins can update bank accounts"
ON public.bank_account
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete bank accounts
CREATE POLICY "Admins can delete bank accounts"
ON public.bank_account
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));