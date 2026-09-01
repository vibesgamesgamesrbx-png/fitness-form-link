import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarHeart, Clock, Loader2, RefreshCw, ClipboardList, CalendarDays, CreditCard, Settings, Search, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { atualizarAgendamento, criarBloqueioRecorrente, listarAgendamentosAdmin, listarBloqueiosRecorrentesAdmin, removerBloqueioRecorrente, souAdmin } from "@/lib/agenda.functions";
import { diaDaSemana, formatarData, hojeISO } from "@/lib/agenda-slots";
import { listarFichasAdmin, listarPagamentosAdmin, type FichaAdmin } from "@/lib/fichas.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({ meta: [
    { title: "Painel da Juliana | Gestão" },
    { name: "description", content: "Painel restrito da Personal Trainer Juliana Truglia." },
  ] }),
});

type Agendamento = { id: string; nome: string; whatsapp: string; data: string; horario: string; plano: string; forma_pagamento: string | null; status_pagamento: string; status_agendamento: string };
type BloqueioRecorrente = { id: string; dia_semana: number; horario: string };
type Pagamento = { id: string; nome: string; whatsapp: string; plano: string; forma_pagamento: string | null; valor_centavos: number; status: string; created_at: string; order_nsu: string };

const DIAS = [{ numero: 1, nome: "Segunda" }, { numero: 2, nome: "Terça" }, { numero: 3, nome: "Quarta" }, { numero: 4, nome: "Quinta" }, { numero: 5, nome: "Sexta" }];
const HORARIOS = Array.from({ length: 19 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`);

function AdminPage() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [fichas, setFichas] = useState<FichaAdmin[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [bloqueiosRecorrentes, setBloqueiosRecorrentes] = useState<BloqueioRecorrente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [fichaAberta, setFichaAberta] = useState<string | null>(null);
  const [perfil, setPerfil] = useState(() => typeof window === "undefined" ? "Juliana Truglia" : window.localStorage.getItem("juliana_perfil_nome") || "Juliana Truglia");

  const carregar = useCallback(async () => {
    setCarregando(true); setErro("");
    try {
      if (!(await souAdmin())) throw new Error("Acesso restrito.");
      const [dados, bloqueios, fichasDados, pagamentosDados] = await Promise.all([listarAgendamentosAdmin(), listarBloqueiosRecorrentesAdmin(), listarFichasAdmin(), listarPagamentosAdmin()]);
      setLista(dados as Agendamento[]); setBloqueiosRecorrentes(bloqueios); setFichas(fichasDados); setPagamentos(pagamentosDados as Pagamento[]);
    } catch (e) { setErro(e instanceof Error && e.message === "Acesso restrito." ? e.message : "Não foi possível carregar o painel agora."); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const bloqueiosSet = useMemo(() => new Set(bloqueiosRecorrentes.map((b) => `${b.dia_semana}|${b.horario.slice(0, 5)}`)), [bloqueiosRecorrentes]);
  const ocupadosSet = useMemo(() => { const hoje = hojeISO(); return new Set(lista.filter((a) => a.status_agendamento !== "cancelado" && a.data >= hoje).map((a) => `${diaDaSemana(a.data)}|${a.horario.slice(0, 5)}`)); }, [lista]);
  const fichasFiltradas = useMemo(() => { const termo = busca.trim().toLowerCase(); return termo ? fichas.filter((f) => f.nome.toLowerCase().includes(termo) || f.whatsapp.includes(termo)) : fichas; }, [fichas, busca]);
  const recebidos = useMemo(() => pagamentos.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor_centavos || 0), 0), [pagamentos]);
  const confirmados = pagamentos.filter((p) => p.status === "pago").length;
  const pendentes = pagamentos.filter((p) => p.status !== "pago").length;

  const alternarHorario = async (diaSemana: number, horario: string) => {
    const chave = `${diaSemana}|${horario}`; if (ocupadosSet.has(chave)) return;
    const existente = bloqueiosRecorrentes.find((b) => `${b.dia_semana}|${b.horario.slice(0, 5)}` === chave);
    setSalvando(chave); setErro(""); setSucesso("");
    if (existente) setBloqueiosRecorrentes((atual) => atual.filter((b) => b.id !== existente.id)); else setBloqueiosRecorrentes((atual) => [...atual, { id: `temp-${chave}`, dia_semana: diaSemana, horario }]);
    try {
      if (existente) { await removerBloqueioRecorrente({ data: { id: existente.id } }); setSucesso(`${DIAS.find((d) => d.numero === diaSemana)?.nome} às ${horario} liberado.`); }
      else { const novo = await criarBloqueioRecorrente({ data: { dia_semana: diaSemana, horario } }); setBloqueiosRecorrentes((atual) => atual.map((b) => b.id === `temp-${chave}` ? novo : b)); setSucesso(`${DIAS.find((d) => d.numero === diaSemana)?.nome} às ${horario} bloqueado semanalmente.`); }
    } catch (e) { setBloqueiosRecorrentes((atual) => existente ? [...atual, existente] : atual.filter((b) => b.id !== `temp-${chave}`)); setErro(e instanceof Error ? e.message : "Não foi possível alterar esse horário."); }
    finally { setSalvando(""); }
  };

  const mudar = async (id: string, patch: { status_pagamento?: string; status_agendamento?: string }) => { setLista((atual) => atual.map((a) => a.id === id ? { ...a, ...patch } : a)); try { await atualizarAgendamento({ data: { id, ...patch } }); await carregar(); } catch { void carregar(); } };
  const salvarPerfil = (value: string) => { setPerfil(value); window.localStorage.setItem("juliana_perfil_nome", value); setSucesso("Nome do painel salvo neste dispositivo."); };
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return <div className="mx-auto max-w-5xl px-4 py-8">
    <header className="text-center"><CalendarHeart className="mx-auto h-7 w-7 text-rosegold" /><h1 className="mt-2 font-display text-3xl italic text-primary">{perfil}</h1><p className="text-xs uppercase tracking-widest text-muted-foreground">Painel Administrativo</p></header>

    <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[["agenda", CalendarHeart, "Minha Agenda", "Disponíveis, bloqueados e ocupados"], ["fichas", ClipboardList, "Fichas das Alunas", `${fichas.length} ficha${fichas.length === 1 ? "" : "s"} cadastrada${fichas.length === 1 ? "" : "s"}`], ["agendamentos", CalendarDays, "Agendamentos", `${lista.length} atendimento${lista.length === 1 ? "" : "s"}`], ["pagamentos", CreditCard, "Pagamentos", `${confirmados} confirmado${confirmados === 1 ? "" : "s"}`]].map(([id, Icon, titulo, descricao]) => <button key={String(id)} type="button" onClick={() => ir(String(id))} className="card-outline flex items-center gap-4 p-5 text-left transition-transform hover:-translate-y-0.5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="h-6 w-6" /></span><span><strong className="font-display text-xl italic text-primary">{String(titulo)}</strong><span className="mt-1 block text-sm text-muted-foreground">{String(descricao)}</span></span></button>)}
    </div>

    {sucesso && <p className="mt-4 text-center text-sm font-semibold text-primary">{sucesso}</p>}{erro && <p className="mt-4 text-center text-sm font-semibold text-destructive">{erro}</p>}{carregando && <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando painel…</p>}

    <section id="agenda" className="card-outline mt-8 scroll-mt-6 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl italic text-primary">📅 Minha Agenda</h2><p className="mt-1 text-sm text-muted-foreground">Clique nos horários para bloquear ou liberar.</p></div><button type="button" onClick={() => void carregar()} disabled={carregando} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar</button></div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-border"><div className="min-w-[620px]"><div className="grid grid-cols-[76px_repeat(5,minmax(100px,1fr))] border-b border-border bg-muted/40 text-center text-xs font-bold text-primary"><div className="p-3 text-left">Horário</div>{DIAS.map((d) => <div key={d.numero} className="p-3">{d.nome}</div>)}</div>{HORARIOS.map((horario) => <div key={horario} className="grid grid-cols-[76px_repeat(5,minmax(100px,1fr))] border-b border-border last:border-b-0"><div className="flex items-center p-2 text-sm font-semibold text-muted-foreground">{horario}</div>{DIAS.map((dia) => { const chave = `${dia.numero}|${horario}`; const ocupado = ocupadosSet.has(chave); const bloqueado = bloqueiosSet.has(chave); const busy = salvando === chave; return <button key={chave} type="button" disabled={ocupado || busy} onClick={() => void alternarHorario(dia.numero, horario)} className={`m-1 flex min-h-12 items-center justify-center rounded-lg border text-xl transition-opacity ${ocupado ? "cursor-not-allowed border-border bg-muted text-muted-foreground" : bloqueado ? "border-border bg-muted text-muted-foreground hover:opacity-70" : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:opacity-70"}`}>{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : ocupado ? "⚫" : bloqueado ? "⚪" : "🟢"}</button>; })}</div>)}</div></div>
      <div className="mt-4 flex justify-center gap-5 text-xs text-muted-foreground"><span>🟢 Disponível</span><span>⚪ Bloqueado</span><span>⚫ Ocupado</span></div>
    </section>

    <section id="fichas" className="mt-8 scroll-mt-6"><div className="mb-4"><h2 className="font-display text-2xl italic text-primary">📋 Fichas das Alunas</h2><p className="text-sm text-muted-foreground">Cada ficha preenchida pelo site fica disponível aqui, somente para a Juliana.</p></div><div className="card-outline mb-4 flex items-center gap-3 p-3"><Search className="h-5 w-5 text-muted-foreground" /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou WhatsApp..." className="w-full bg-transparent text-sm outline-none" /></div><div className="flex flex-col gap-3">
      {fichasFiltradas.map((ficha) => { const aberta = fichaAberta === ficha.id; return <article key={ficha.id} className="card-outline overflow-hidden"><button type="button" onClick={() => setFichaAberta(aberta ? null : ficha.id)} className="flex w-full items-center justify-between gap-4 p-4 text-left"><span><strong className="font-display text-xl italic text-primary">{ficha.nome}</strong><span className="mt-1 block text-sm text-muted-foreground">{ficha.idade ? `${ficha.idade} anos` : "Idade não informada"} · {ficha.objetivos.join(", ") || "Objetivo não informado"}</span></span>{aberta ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}</button>{aberta && <div className="border-t border-border p-4"><div className="mb-4 rounded-xl bg-accent/40 p-4 text-sm"><p><b>WhatsApp:</b> {ficha.whatsapp}</p><p><b>Data de nascimento:</b> {ficha.data_nascimento ? new Date(`${ficha.data_nascimento}T00:00:00`).toLocaleDateString("pt-BR") : "Não informado"}</p></div><div className="grid gap-4 sm:grid-cols-2">{ficha.dados.map((secao) => <div key={secao.titulo} className="rounded-xl border border-border p-4"><h3 className="font-display text-lg italic text-primary">{secao.titulo}</h3><div className="mt-3 flex flex-col gap-3">{secao.itens.map((i) => <div key={`${secao.titulo}-${i.rotulo}`}><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{i.rotulo}</p><p className="mt-0.5 whitespace-pre-wrap text-sm">{i.valor || "Não informado"}</p></div>)}</div></div>)}</div><button type="button" onClick={() => window.print()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary"><Printer className="h-4 w-4" /> Imprimir / salvar PDF</button></div>}</article>; })}{!carregando && fichasFiltradas.length === 0 && <p className="card-outline p-5 text-center text-sm text-muted-foreground">Nenhuma ficha encontrada.</p>}</div></section>

    <section id="agendamentos" className="mt-8 scroll-mt-6"><div className="mb-4"><h2 className="font-display text-2xl italic text-primary">📆 Agendamentos</h2><p className="text-sm text-muted-foreground">Atendimentos marcados e seus status.</p></div><div className="flex flex-col gap-3">{lista.map((a) => <article key={a.id} className="card-outline p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-display text-xl italic text-primary">{a.nome}</h3><span className="text-sm font-semibold">{formatarData(a.data)} · {a.horario.slice(0, 5)}</span></div><p className="mt-1 text-sm text-muted-foreground">{a.plano} · {a.forma_pagamento ?? "forma não informada"}</p><div className="mt-3 flex flex-wrap gap-2">{["pendente", "pago"].map((s) => <button key={s} type="button" onClick={() => void mudar(a.id, { status_pagamento: s })} className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${a.status_pagamento === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>{s === "pago" ? "Pagamento confirmado" : "Pagamento pendente"}</button>)}{["reservado", "confirmado", "cancelado"].map((s) => <button key={s} type="button" onClick={() => void mudar(a.id, { status_agendamento: s })} className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${a.status_agendamento === s ? "bg-rosegold text-white" : "border border-border text-muted-foreground"}`}>{s}</button>)}</div></article>)}{!carregando && lista.length === 0 && <p className="card-outline p-5 text-center text-sm text-muted-foreground">Nenhum agendamento por aqui ainda.</p>}</div></section>

    <section id="pagamentos" className="mt-8 scroll-mt-6"><div className="mb-4"><h2 className="font-display text-2xl italic text-primary">💰 Pagamentos</h2><p className="text-sm text-muted-foreground">Resumo financeiro e histórico dos pagamentos.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="card-outline p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Recebidos</p><p className="mt-1 font-display text-2xl italic text-primary">R$ {(recebidos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p></div><div className="card-outline p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Confirmados</p><p className="mt-1 font-display text-2xl italic text-primary">{confirmados}</p></div><div className="card-outline p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Pendentes</p><p className="mt-1 font-display text-2xl italic text-primary">{pendentes}</p></div></div><div className="mt-4 flex flex-col gap-3">{pagamentos.map((p) => <article key={p.id} className="card-outline flex flex-wrap items-center justify-between gap-3 p-4"><div><h3 className="font-semibold text-primary">{p.nome}</h3><p className="text-sm text-muted-foreground">{p.plano} · {p.forma_pagamento ?? "não informado"}</p></div><div className="text-right"><p className="font-semibold">R$ {(Number(p.valor_centavos) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><span className={`text-xs font-bold uppercase ${p.status === "pago" ? "text-emerald-600" : "text-muted-foreground"}`}>{p.status}</span></div></article>)}{!carregando && pagamentos.length === 0 && <p className="card-outline p-5 text-center text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>}</div></section>

    <section id="configuracoes" className="card-outline mt-8 scroll-mt-6 p-5"><div className="flex items-center gap-2"><Settings className="h-5 w-5 text-rosegold" /><h2 className="font-display text-2xl italic text-primary">⚙️ Configurações</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-primary">👤 Perfil da Juliana</h3><label className="mt-3 block text-sm font-medium">Nome exibido<input value={perfil} onChange={(e) => salvarPerfil(e.target.value)} className="field-input mt-1" /></label><p className="mt-2 text-xs text-muted-foreground">WhatsApp profissional: (11) 94011-0447</p></div><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-primary">💳 Planos e preços</h3><p className="mt-2 text-sm text-muted-foreground">Planos ativos: 2x, 3x e 4x por semana, com opções mensal e trimestral.</p></div><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-primary">🕐 Horários</h3><p className="mt-2 text-sm text-muted-foreground">A disponibilidade semanal é controlada diretamente em Minha Agenda. Os bloqueios ficam salvos no banco.</p></div><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-primary">🔐 Segurança</h3><p className="mt-2 text-sm text-muted-foreground">As fichas de anamnese ficam protegidas no banco e são consultadas somente pelo painel autenticado da Juliana.</p></div></div></section>
    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Painel protegido para a administradora.</div>
  </div>;
}
