-- Prevent the same exact block from being created twice.
CREATE UNIQUE INDEX IF NOT EXISTS agenda_bloqueios_slot_unico
  ON public.agenda_bloqueios (data, COALESCE(horario, '00:00:00'::time));

-- The admin server functions use service_role only after checking the admin role.
-- Public visitors continue to have no access to the underlying table.
REVOKE ALL ON public.agenda_bloqueios FROM anon, authenticated;
GRANT SELECT ON public.agenda_bloqueios_publicos TO anon, authenticated;
