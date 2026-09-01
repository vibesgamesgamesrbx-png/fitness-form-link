import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";

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

const URL_KEY = "juliana_google_sheets_url";
const TOKEN_KEY = "juliana_google_sheets_token";

export function AdminGoogleSheets({ lista }: { lista: Agendamento[] }) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState<"ok" | "erro" | "">("");

  useEffect(() => {
    setUrl(localStorage.getItem(URL_KEY) ?? "");
    setToken(localStorage.getItem(TOKEN_KEY) ?? "");
  }, []);

  const salvar = () => {
    localStorage.setItem(URL_KEY, url.trim());
    localStorage.setItem(TOKEN_KEY, token.trim());
    setMensagem("Configuração salva neste navegador.");
    setTipoMensagem("ok");
  };

  const sincronizar = async () => {
    const endpoint = url.trim();
    const segredo = token.trim();
    if (!endpoint) {
      setMensagem("Cole primeiro a URL do Google Apps Script.");
      setTipoMensagem("erro");
      return;
    }
    if (!/^https:\/\/(script\.google\.com|script\.googleusercontent\.com)\//i.test(endpoint)) {
      setMensagem("A URL precisa ser a URL /exec do Google Apps Script.");
      setTipoMensagem("erro");
      return;
    }

    setSalvando(true);
    setMensagem("");
    setTipoMensagem("");
    try {
      const dados = lista.map((a) => ({
        id: a.id,
        nome: a.nome,
        whatsapp: a.whatsapp,
        plano: a.plano,
        forma_pagamento: a.forma_pagamento ?? "",
        data: a.data,
        horario: a.horario.slice(0, 5),
        status_pagamento: a.status_pagamento,
        status_agendamento: a.status_agendamento,
      }));

      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ token: segredo, agendamentos: dados }),
      });

      localStorage.setItem(URL_KEY, endpoint);
      localStorage.setItem(TOKEN_KEY, segredo);
      setMensagem(`${dados.length} agendamento(s) enviado(s) para o Google Sheets.`);
      setTipoMensagem("ok");
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : "Não foi possível enviar os dados.");
      setTipoMensagem("erro");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="card-outline mt-6 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl italic text-primary">Google Sheets</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exporte os agendamentos do painel para uma planilha. Dados de saúde e da anamnese não são enviados.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-1.5 text-sm font-semibold text-primary">
          URL do Google Apps Script
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/20"
            inputMode="url"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-semibold text-primary">
          Token de segurança
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="O mesmo token configurado no Apps Script"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/20"
            type="password"
            autoComplete="new-password"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={salvar} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-primary hover:opacity-80">
            Salvar configuração
          </button>
          <button type="button" onClick={() => void sincronizar()} disabled={salvando} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
            {salvando ? "Sincronizando…" : "Sincronizar agora"}
          </button>
        </div>

        {mensagem && (
          <p className={`text-sm font-semibold ${tipoMensagem === "erro" ? "text-destructive" : "text-primary"}`}>
            {mensagem}
          </p>
        )}
      </div>
    </section>
  );
}
