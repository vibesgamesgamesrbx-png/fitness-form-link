-- Ensure the recurring agenda block table exists in the connected Supabase database.
-- Idempotent so this is safe if the original migration was already applied.
CREATE TABLE IF NOT EXISTS public.agenda_bloqueios_recorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
  horario time NOT NULL CHECK (EXTRACT(MINUTE FROM horario) = 0 AND EXTRACT(SECOND FROM horario) = 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dia_semana, horario)
);

ALTER TABLE public.agenda_bloqueios_recorrentes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.agenda_bloqueios_recorrentes TO service_role;

DROP POLICY IF EXISTS "admin gerencia bloqueios recorrentes" ON public.agenda_bloqueios_recorrentes;
CREATE POLICY "admin gerencia bloqueios recorrentes"
ON public.agenda_bloqueios_recorrentes
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.horarios_bloqueados_recorrentes_publicos()
RETURNS TABLE (dia_semana smallint, horario time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.dia_semana, b.horario
  FROM public.agenda_bloqueios_recorrentes b;
$$;

GRANT EXECUTE ON FUNCTION public.horarios_bloqueados_recorrentes_publicos() TO anon, authenticated;
