/** Utilitários puros (sem backend) para montar a agenda. */

export const TIMEZONE = "America/Sao_Paulo";

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export type AgendaConfig = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  duracao_min: number;
  intervalo_min: number;
  ativo: boolean;
};

export type Bloqueio = { data: string; horario: string | null };

export type SlotAgenda = { horario: string; ocupado: boolean };
export type DiaAgenda = {
  data: string; // YYYY-MM-DD
  rotulo: string; // "Segunda — 31/08"
  slots: SlotAgenda[];
};

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function hojeISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diaDaSemana(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function rotuloDia(iso: string): string {
  return `${DIAS_SEMANA[diaDaSemana(iso)]} — ${formatarData(iso).slice(0, 5)}`;
}

const hhmm = (t: string) => t.slice(0, 5);

function paraMinutos(t: string) {
  const [h, m] = hhmm(t).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function paraHora(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Monta os próximos dias da agenda com horários livres/ocupados. */
export function montarAgenda(
  configs: AgendaConfig[],
  ocupados: { data: string; horario: string }[],
  bloqueios: Bloqueio[],
  dias = 21,
  inicio = hojeISO(),
): DiaAgenda[] {
  const ocupadoSet = new Set(ocupados.map((o) => `${o.data}|${hhmm(o.horario)}`));
  const diasBloqueados = new Set(
    bloqueios.filter((b) => !b.horario).map((b) => b.data),
  );
  const slotsBloqueados = new Set(
    bloqueios.filter((b) => b.horario).map((b) => `${b.data}|${hhmm(b.horario!)}`),
  );

  const resultado: DiaAgenda[] = [];
  for (let i = 1; i <= dias; i++) {
    const data = somarDias(inicio, i);
    if (diasBloqueados.has(data)) continue;
    const cfg = configs.find((c) => c.dia_semana === diaDaSemana(data) && c.ativo);
    if (!cfg) continue;

    const passo = Math.max(15, cfg.duracao_min + cfg.intervalo_min);
    const slots: SlotAgenda[] = [];
    for (
      let min = paraMinutos(cfg.hora_inicio);
      min + cfg.duracao_min <= paraMinutos(cfg.hora_fim);
      min += passo
    ) {
      const horario = paraHora(min);
      if (slotsBloqueados.has(`${data}|${horario}`)) continue;
      slots.push({ horario, ocupado: ocupadoSet.has(`${data}|${horario}`) });
    }
    if (slots.length) resultado.push({ data, rotulo: rotuloDia(data), slots });
  }
  return resultado;
}
