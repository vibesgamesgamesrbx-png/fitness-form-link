-- Expose only the minimum schedule information to public visitors.
-- Customer/payment data and internal block reasons remain private.

-- Public view for blocked slots: no internal `motivo` column.
CREATE OR REPLACE VIEW public.agenda_bloqueios_publicos
WITH (security_invoker = true)
AS
SELECT data, horario
FROM public.agenda_bloqueios;

REVOKE ALL ON public.agenda_bloqueios FROM anon, authenticated;
GRANT SELECT ON public.agenda_bloqueios_publicos TO anon, authenticated;

DROP POLICY IF EXISTS "bloqueios publicos" ON public.agenda_bloqueios;

-- Public view for occupied appointment slots: no customer information.
CREATE OR REPLACE VIEW public.agendamentos_slots_publicos
WITH (security_invoker = true)
AS
SELECT data, horario
FROM public.agendamentos
WHERE status_agendamento <> 'cancelado'
  AND data >= current_date;

GRANT SELECT ON public.agendamentos_slots_publicos TO anon, authenticated;

-- Replace the SECURITY DEFINER occupancy function with an invoker function.
-- The public view exposes only date/time, so no customer data is reachable.
CREATE OR REPLACE FUNCTION public.horarios_ocupados()
RETURNS TABLE (data date, horario time)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT data, horario
  FROM public.agendamentos_slots_publicos;
$$;

GRANT EXECUTE ON FUNCTION public.horarios_ocupados() TO anon, authenticated;
