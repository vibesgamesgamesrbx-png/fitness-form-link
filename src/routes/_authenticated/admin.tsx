import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Loader2, RefreshCw } from "lucide-react";
import {
  ativarAdmin,
  atualizarAgendamento,
  listarAgendamentosAdmin,
  souAdmin,
} from "@/lib/agenda.functions";
import { formatarData } from "@/lib/agenda-slots";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Agenda da Juliana | Painel de atendimentos" },
      {
        name: "description",
        content:
          "Painel restrito da Personal Trainer Juliana Truglia para acompanhar agendamentos, planos e pagamentos.",
      },
      { property: "og:title", content: "Agenda da Juliana — Painel" },
      {
        property: "og:description",
        content: "Painel restrito para acompanhar agendamentos e pagamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Agendamento = {
  id: string;
  nome: string;
  whatsapp: string;
  data: string;
  horario: string;
  plano: string;
  forma_pagamento: string | null;
  status_pagamento: string;
  status_agendamento: string;
};

function AdminPage() {
  const [lista, setLista] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const admin = await souAdmin();
      if (!admin) await ativarAdmin();
      const dados = await listarAgendamentosAdmin();
      setLista(dados as Agendamento[]);
    } catch {
      setErro("Não foi possível carregar a agenda agora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const mudar = async (
    id: string,
    patch: { status_pagamento?: string; status_agendamento?: string },
  ) => {
    setLista((atual) => atual.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    try {
      await atualizarAgendamento({ data: { id, ...patch } });
    } catch {
      void carregar();
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="text-center">
        <CalendarHeart className="mx-auto h-6 w-6 text-rosegold" />
        <h1 className="mt-2 font-display text-3xl italic text-primary">Agenda da Juliana</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Atendimentos agendados
        </p>
      </header>

      <button
        type="button"
        onClick={() => void carregar()}
        className="mx-auto mt-5 flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-primary"
      >
        <RefreshCw className="h-4 w-4" /> Atualizar
      </button>

      {carregando && (
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </p>
      )}
      {erro && <p className="mt-6 text-center text-sm font-semibold text-destructive">{erro}</p>}
      {!carregando && !erro && lista.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Nenhum agendamento por aqui ainda.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {lista.map((a) => (
          <article key={a.id} className="card-outline p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl italic text-primary">{a.nome}</h2>
              <span className="text-sm font-semibold">
                {formatarData(a.data)} · {a.horario.slice(0, 5)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {a.plano} · {a.forma_pagamento ?? "forma não informada"}
            </p>
            <a
              href={`https://wa.me/${a.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              WhatsApp da cliente
            </a>
            <div className="mt-3 flex flex-wrap gap-2">
              {["pendente", "pago"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void mudar(a.id, { status_pagamento: s })}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    a.status_pagamento === s
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {s === "pago" ? "Pagamento confirmado" : "Pagamento pendente"}
                </button>
              ))}
              {["reservado", "confirmado", "cancelado"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void mudar(a.id, { status_agendamento: s })}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    a.status_agendamento === s
                      ? "bg-rosegold text-white"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
