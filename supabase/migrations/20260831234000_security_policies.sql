-- Explicitly document the intended fail-closed public access for sensitive tables.
-- Customer/payment writes are performed only through trusted server code using service_role.

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert agendamentos denied" ON public.agendamentos;
CREATE POLICY "public insert agendamentos denied"
  ON public.agendamentos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin ve pagamentos" ON public.pagamentos;
CREATE POLICY "admin ve pagamentos"
  ON public.pagamentos
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "public insert pagamentos denied" ON public.pagamentos;
CREATE POLICY "public insert pagamentos denied"
  ON public.pagamentos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "public update pagamentos denied" ON public.pagamentos;
CREATE POLICY "public update pagamentos denied"
  ON public.pagamentos
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "public delete pagamentos denied" ON public.pagamentos;
CREATE POLICY "public delete pagamentos denied"
  ON public.pagamentos
  FOR DELETE
  TO anon, authenticated
  USING (false);
