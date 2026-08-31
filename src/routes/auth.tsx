import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Acesso da Juliana | Agenda Personal Trainer" },
      {
        name: "description",
        content: "Área restrita para a Personal Trainer Juliana Truglia acessar a agenda de atendimentos.",
      },
      { property: "og:title", content: "Acesso da Juliana — Agenda" },
      { property: "og:description", content: "Área restrita da agenda de atendimentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res =
        modo === "entrar"
          ? await supabase.auth.signInWithPassword({ email, password: senha })
          : await supabase.auth.signUp({
              email,
              password: senha,
              options: { emailRedirectTo: `${window.location.origin}/admin` },
            });
      if (res.error) {
        setErro(res.error.message);
        return;
      }
      if (res.data.session) navigate({ to: "/admin" });
      else setErro("Confirme o seu e-mail para entrar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={enviar} className="card-outline flex w-full max-w-sm flex-col gap-4 p-6">
        <div className="text-center">
          <Heart className="mx-auto h-5 w-5 text-rosegold" fill="currentColor" />
          <h1 className="mt-2 font-display text-3xl italic text-primary">Área da Juliana</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Agenda de atendimentos
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          E-mail
          <input
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Senha
          <input
            type="password"
            className="field-input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            minLength={6}
            required
          />
        </label>
        {erro && <p className="text-sm font-semibold text-destructive">{erro}</p>}
        <button
          type="submit"
          disabled={carregando}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
        >
          {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
          {modo === "entrar" ? "Entrar" : "Criar acesso"}
        </button>
        <button
          type="button"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="text-xs font-semibold text-primary underline underline-offset-4"
        >
          {modo === "entrar" ? "Primeiro acesso? Criar conta" : "Já tenho acesso — entrar"}
        </button>
      </form>
    </div>
  );
}
