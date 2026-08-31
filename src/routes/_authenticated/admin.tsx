import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, LogOut, RefreshCw, XCircle } from "lucide-react";
import {
  ativarAdmin,
  atualizarAgendamento,
  listarAgendamentosAdmin,
  souAdmin,
} from "@/lib/agenda.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const carregar = async () => {
    setLoading(true);
    setMessage("");
    try {
      const admin = await souAdmin();
      setIsAdmin(admin);
      if (admin) setItems(await listarAgendamentosAdmin());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void carregar();
  }, []);

  const ativar = async () => {
    setBusy("ativar");
    const ok = await ativarAdmin();
    setIsAdmin(ok);
    if (ok) await carregar();
    else setMessage("Não foi possível ativar este usuário como administradora.");
    setBusy("");
  };

  const atualizar = async (id: string, patch: { status_pagamento?: string; status_agendamento?: string }) => {
    setBusy(id);
    try {
      await atualizarAgendamento({ data: { id, ...patch } });
      await carregar();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally {
      setBusy("");
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-background p-6">Carregando agenda...</main>;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <CalendarDays className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-semibold">Área da Juliana</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este primeiro acesso pode ativar a conta autenticada como administradora.
          </p>
          <button
            onClick={() => void ativar()}
            disabled={busy === "ativar"}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy === "ativar" ? "Ativando..." : "Ativar acesso da administradora"}
          </button>
          {message && <p className="mt-3 text-sm text-destructive">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Juliana Truglia</p>
            <h1 className="mt-1 text-3xl font-semibold">Agenda</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pagamentos confirmados e horários reservados automaticamente.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void carregar()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
            <button onClick={() => void sair()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </header>

        {message && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{message}</div>}

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="p-3 text-left">Data</th>
                <th className="p-3 text-left">Horário</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">WhatsApp</th>
                <th className="p-3 text-left">Plano</th>
                <th className="p-3 text-left">Pagamento</th>
                <th className="p-3 text-left">Agendamento</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="p-3">{item.data}</td>
                  <td className="p-3 font-semibold">{item.horario}</td>
                  <td className="p-3">{item.nome}</td>
                  <td className="p-3">{item.whatsapp}</td>
                  <td className="p-3">{item.plano}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {item.status_pagamento ?? "confirmado"}
                    </span>
                  </td>
                  <td className="p-3">{item.status_agendamento ?? "confirmado"}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => void atualizar(item.id, { status_agendamento: "cancelado" })}
                      disabled={busy === item.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Cancelar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">Nenhum agendamento confirmado ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
