import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarHeart, Clock, Loader2, RefreshCw } from "lucide-react";
import {
  atualizarAgendamento,
  criarBloqueioRecorrente,
  listarAgendamentosAdmin,
  listarBloqueiosRecorrentesAdmin,
  removerBloqueioRecorrente,
  souAdmin,
} from "@/lib/agenda.functions";
import { diaDaSemana, formatarData, hojeISO } from "@/lib/agenda-slots";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Agenda da Juliana | Painel de atendimentos" },
      { name: "description", content: "Painel restrito da Personal Trainer Juliana Truglia para acompanhar agendamentos e controlar a disponibilidade." },
    ],
  }),
});

type Agendamento = {
  id: string; nome: string; whatsapp: string; data: string; horario: string;
  plano: string; forma_pagamento: string | null; status_pagamento: string; status_agendamento: string;
};
type BloqueioRecorrente = { id: string; dia_semana: number; horario: string };

const DIAS = [
  { numero: 1, nome: "Segunda" },
  { numero: 2, nome: "Terça" },
  { numero: 3, nome: "Quarta" },
  { numero: 4, nome: "Quinta" },
  { numero: 5, nome: "Sexta" },
];
const HORARIOS = Array.from({ length: 19 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`);

function AdminPage() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [bloqueiosRecorrentes, setBloqueiosRecorrentes] = useState<BloqueioRecorrente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      if (!(await souAdmin())) throw new Error("Acesso restrito.");
      const [dados, bloqueios] = await Promise.all([listarAgendamentosAdmin(), listarBloqueiosRecorrentesAdmin()]);
      setLista(dados as Agendamento[]);
      setBloqueiosRecorrentes(bloqueios);
    } catch (e) {
      setErro(e instanceof Error && e.message === "Acesso restrito." ? e.message : "Não foi possível carregar a agenda agora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const bloqueiosSet = useMemo(
    () => new Set(bloqueiosRecorrentes.map((b) => `${b.dia_semana}|${b.horario.slice(0, 5)}`)),
    [bloqueiosRecorrentes],
  );

  const ocupadosSet = useMemo(() => {
    const hoje = hojeISO();
    return new Set(
      lista
        .filter((a) => a.status_agendamento !== "cancelado" && a.data >= hoje)
        .map((a) => `${diaDaSemana(a.data)}|${a.horario.slice(0, 5)}`),
    );
  }, [lista]);

  const alternarHorario = async (diaSemana: number, horario: string) => {
    const chave = `${diaSemana}|${horario}`;
    if (ocupadosSet.has(chave)) return;

    const existente = bloqueiosRecorrentes.find((b) => `${b.dia_semana}|${b.horario.slice(0, 5)}` === chave);
    setSalvando(chave); setErro(""); setSucesso("");

    // Atualiza a interface imediatamente: bloqueado = cinza, liberado = verde.
    if (existente) {
      setBloqueiosRecorrentes((atual) => atual.filter((b) => b.id !== existente.id));
    } else {
      setBloqueiosRecorrentes((atual) => [...atual, { id: `temp-${chave}`, dia_semana: diaSemana, horario }]);
    }

    try {
      if (existente) {
        await removerBloqueioRecorrente({ data: { id: existente.id } });
        setSucesso(`${DIAS.find((d) => d.numero === diaSemana)?.nome} às ${horario} liberado.`);
      } else {
        const novo = await criarBloqueioRecorrente({ data: { dia_semana: diaSemana, horario } });
        setBloqueiosRecorrentes((atual) => atual.map((b) => b.id === `temp-${chave}` ? novo : b));
        setSucesso(`${DIAS.find((d) => d.numero === diaSemana)?.nome} às ${horario} bloqueado semanalmente.`);
      }
    } catch (e) {
      // Desfaz a alteração visual se o servidor recusar a operação.
      setBloqueiosRecorrentes((atual) => {
        if (existente) return [...atual, existente];
        return atual.filter((b) => b.id !== `temp-${chave}`);
      });
      setErro(e instanceof Error ? e.message : "Não foi possível alterar esse horário.");
    } finally {
      setSalvando("");
    }
  };

  const mudar = async (id: string, patch: { status_pagamento?: string; status_agendamento?: string }) => {
    setLista((atual) => atual.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    try { await atualizarAgendamento({ data: { id, ...patch } }); } catch { void carregar(); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="text-center">
        <CalendarHeart className="mx-auto h-6 w-6 text-rosegold" />
        <h1 className="mt-2 font-display text-3xl italic text-primary">Agenda da Juliana</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel de atendimentos</p>
      </header>

      <section className="card-outline mt-6 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl italic text-primary">Minha agenda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Toque nos horários para bloquear ou liberar sua disponibilidade.</p>
          </div>
          <button type="button" onClick={() => void carregar()} disabled={carregando} className="flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50" aria-label="Atualizar agenda">
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-[76px_repeat(5,minmax(100px,1fr))] border-b border-border bg-muted/40 text-center text-xs font-bold text-primary">
              <div className="p-3 text-left">Horário</div>
              {DIAS.map((dia) => <div key={dia.numero} className="p-3">{dia.nome}</div>)}
            </div>

            {HORARIOS.map((horario) => (
              <div key={horario} className="grid grid-cols-[76px_repeat(5,minmax(100px,1fr))] border-b border-border last:border-b-0">
                <div className="flex items-center p-2 text-sm font-semibold text-muted-foreground">{horario}</div>
                {DIAS.map((dia) => {
                  const chave = `${dia.numero}|${horario}`;
                  const ocupado = ocupadosSet.has(chave);
                  const bloqueado = bloqueiosSet.has(chave);
                  const salvandoEsse = salvando === chave;
                  const estado = ocupado ? "Ocupado" : bloqueado ? "Bloqueado" : "Disponível";
                  return (
                    <button
                      key={chave}
                      type="button"
                      disabled={ocupado || salvandoEsse}
                      onClick={() => void alternarHorario(dia.numero, horario)}
                      title={ocupado ? "Horário ocupado por agendamento real" : bloqueado ? "Clique para liberar" : "Clique para bloquear"}
                      aria-label={`${dia.nome}, ${horario}: ${estado}`}
                      className={`m-1 flex min-h-12 items-center justify-center rounded-lg border text-xl transition-opacity ${
                        ocupado
                          ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                          : bloqueado
                            ? "border-border bg-muted text-muted-foreground hover:opacity-70"
                            : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:opacity-70"
                      }`}
                    >
                      {salvandoEsse ? <Loader2 className="h-5 w-5 animate-spin" /> : ocupado ? "⚫" : bloqueado ? "⚪" : "🟢"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span>🟢 Disponível</span>
          <span>⚪ Bloqueado</span>
          <span>⚫ Ocupado</span>
        </div>
      </section>

      {sucesso && <p className="mt-4 text-center text-sm font-semibold text-primary">{sucesso}</p>}
      {erro && <p className="mt-4 text-center text-sm font-semibold text-destructive">{erro}</p>}

      {carregando && <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>}
      {!carregando && !erro && lista.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Nenhum agendamento por aqui ainda.</p>}

      <div className="mt-6 flex flex-col gap-3">
        {lista.map((a) => (
          <article key={a.id} className="card-outline p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl italic text-primary">{a.nome}</h2>
              <span className="text-sm font-semibold">{formatarData(a.data)} · {a.horario.slice(0, 5)}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{a.plano} · {a.forma_pagamento ?? "forma não informada"}</p>
            <a href={`https://wa.me/${a.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">WhatsApp da cliente</a>
            <div className="mt-3 flex flex-wrap gap-2">
              {["pendente", "pago"].map((s) => (
                <button key={s} type="button" onClick={() => void mudar(a.id, { status_pagamento: s })} className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${a.status_pagamento === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                  {s === "pago" ? "Pagamento confirmado" : "Pagamento pendente"}
                </button>
              ))}
              {["reservado", "confirmado", "cancelado"].map((s) => (
                <button key={s} type="button" onClick={() => void mudar(a.id, { status_agendamento: s })} className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${a.status_agendamento === s ? "bg-rosegold text-white" : "border border-border text-muted-foreground"}`}>{s}</button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Horários ocupados aparecem em cinza e não podem ser liberados.</span>
      </div>
    </div>
  );
}
