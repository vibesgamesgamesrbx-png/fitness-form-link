CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Bootstrap: primeira administradora
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN RETURN public.has_role(auth.uid(), 'admin'); END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;

CREATE TABLE public.agenda_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL DEFAULT '08:00',
  hora_fim time NOT NULL DEFAULT '18:00',
  duracao_min int NOT NULL DEFAULT 60,
  intervalo_min int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dia_semana)
);
GRANT SELECT ON public.agenda_config TO anon, authenticated;
GRANT ALL ON public.agenda_config TO service_role;
ALTER TABLE public.agenda_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config publica" ON public.agenda_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin gerencia config" ON public.agenda_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.agenda_bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  horario time,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agenda_bloqueios TO anon, authenticated;
GRANT ALL ON public.agenda_bloqueios TO service_role;
ALTER TABLE public.agenda_bloqueios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bloqueios publicos" ON public.agenda_bloqueios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin gerencia bloqueios" ON public.agenda_bloqueios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.agendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL,
  data date NOT NULL,
  horario time NOT NULL,
  plano text NOT NULL,
  forma_pagamento text,
  status_pagamento text NOT NULL DEFAULT 'pendente'
    CHECK (status_pagamento IN ('pendente','confirmado','recusado')),
  status_agendamento text NOT NULL DEFAULT 'reservado'
    CHECK (status_agendamento IN ('reservado','confirmado','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agendamentos_slot_unico
  ON public.agendamentos (data, horario)
  WHERE status_agendamento <> 'cancelado';

GRANT SELECT, UPDATE, DELETE ON public.agendamentos TO authenticated;
GRANT ALL ON public.agendamentos TO service_role;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin ve agendamentos" ON public.agendamentos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin atualiza agendamentos" ON public.agendamentos FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin apaga agendamentos" ON public.agendamentos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Horários ocupados: público, sem nenhum dado pessoal
CREATE OR REPLACE FUNCTION public.horarios_ocupados()
RETURNS TABLE (data date, horario time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.data, a.horario FROM public.agendamentos a
  WHERE a.status_agendamento <> 'cancelado' AND a.data >= current_date;
$$;
GRANT EXECUTE ON FUNCTION public.horarios_ocupados() TO anon, authenticated;

INSERT INTO public.agenda_config (dia_semana, hora_inicio, hora_fim, duracao_min, intervalo_min, ativo) VALUES
  (1,'08:00','18:00',60,0,true),
  (2,'08:00','18:00',60,0,true),
  (3,'08:00','18:00',60,0,true),
  (4,'08:00','18:00',60,0,true),
  (5,'08:00','18:00',60,0,true),
  (6,'08:00','12:00',60,0,true),
  (0,'08:00','12:00',60,0,false);