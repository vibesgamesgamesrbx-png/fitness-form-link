import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Clock, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  atualizarAgendamento,
  criarBloqueio,
  listarAgendamentosAdmin,
  listarBloqueiosAdmin,
  removerBloqueio,
  souAdmin,
} from "@/lib/agenda.functions";
import { formatarData } from "@/lib/agenda-slots";

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
type Bloqueio = { id: string; data: string; horario: string | null; motivo: string | null };

function AdminPage() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [dataBloqueio, setDataBloqueio] = useState("");
  const [horaBloqueio, setHoraBloqueio] = useState("");
  const [motivo, setMotivo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvandoBloqueio, setSalvandoBloqueio] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      if (!(await souAdmin())) throw new Error("Acesso restrito.");
      const [dados, bloqueiosAtuais] = await Promise.all([listarAgendamentosAdmin(), listarBloqueiosAdmin()]);
      setLista(dados as Agendamento[]);
      setBloqueios(bloqueiosAtuais);
    } catch {
      setErro("Não foi possível carregar a agenda agora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const adicionarBloqueio = async () => {
    if (!dataBloqueio) return;
    setSalvandoBloqueio(true); setErro(""); setSucesso("");
    try {
      const novo = await criarBloqueio({ data: { data: dataBloqueio, horario: horaBloqueio || null, motivo } });
      setBloqueios((atual) => [...atual, novo].sort((a, b) => `${a.data}${a.horario ?? ""}`.localeCompare(`${b.data}${b.horario ?? ""}`)));
      setDataBloqueio(""); setHoraBloqueio(""); setMotivo("");
      setSucesso(horaBloqueio ? "Horário bloqueado com sucesso." : "Dia inteiro bloqueado com sucesso.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o bloqueio.");
    } finally { setSalvandoBloqueio(false); }
  };

  const excluirBloqueio = async (id: string) => {
    setErro(""); setSucesso("");
    try {
      await removerBloqueio({ data: { id } });
      setBloqueios((atual) => atual.filter((b) => b.id !== id));
      setSucesso("Disponibilidade liberada novamente.");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível remover o bloqueio."); }
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
        <h2 className="font-display text-2xl italic text-primary">Minha disponibilidade</h2>
        <p className="mt-1 text-sm text-muted-foreground">Bloqueie um horário em que você não poderá atender. A cliente verá o horário em cinza e não poderá selecioná-lo.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium sm:col-span-1">Data
            <input type="date" value={dataBloqueio} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDataBloqueio(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3" />
          </label>
          <label className="text-sm font-medium sm:col-span-1">Horário <span className="font-normal text-muted-foreground">(vazio = dia todo)</span>
            <input type="time" value={horaBloqueio} onChange={(e) => setHoraBloqueio(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3" />
          </label>
          <label className="text-sm font-medium sm:col-span-1">Motivo <span className="font-normal text-muted-foreground">(privado)</span>
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={120} placeholder="Ex.: compromisso" className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3" />
          </label>
        </div>
        <button type="button" disabled={!dataBloqueio || salvandoBloqueio} onClick={() => void adicionarBloqueio()} className="mt-3 flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {salvandoBloqueio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Bloquear disponibilidade
        </button>

        {bloqueios.length > 0 && (
          <div className="mt-5 space-y-2">
            {bloqueios.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
                <div>
                  <p className="font-semibold">{formatarData(b.data)} {b.horario ? `· ${b.horario.slice(0, 5)}` : "· dia inteiro"}</p>
                  {b.motivo && <p className="text-xs text-muted-foreground">Motivo: {b.motivo}</p>}
                </div>
                <button type="button" onClick={() => void excluirBloqueio(b.id)} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive" aria-label="Liberar horário">
                  <Trash2 className="h-3.5 w-3.5" /> Liberar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {sucesso && <p className="mt-4 text-center text-sm font-semibold text-primary">{sucesso}</p>}
      {erro && <p className="mt-4 text-center text-sm font-semibold text-destructive">{erro}</p>}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => void carregar()} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary"><RefreshCw className="h-4 w-4" /> Atualizar</button>
      </div>

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
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Horários ocupados aparecem em cinza para as clientes.</span>
      </div>
    </div>
  );
}
