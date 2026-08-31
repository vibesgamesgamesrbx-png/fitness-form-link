import { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Clock, Check, Loader2, RefreshCw, MessageCircle } from "lucide-react";
import { criarAgendamento, listarAgenda } from "@/lib/agenda.functions";
import { consultarPagamento } from "@/lib/payment.functions";
import { formatarData, type DiaAgenda } from "@/lib/agenda-slots";

type Props = {
  nome: string;
  whatsapp: string;
  plano: string;
  pagamento: string;
  orderNsu: string;
  onConfirmado: (data: string, horario: string) => void;
};

export default function Agenda({ nome, whatsapp, plano, pagamento, orderNsu, onConfirmado }: Props) {
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(true);
  const [dias, setDias] = useState<DiaAgenda[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [diaSel, setDiaSel] = useState("");
  const [horaSel, setHoraSel] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [confirmacao, setConfirmacao] = useState<{ data: string; horario: string } | null>(null);

  const verificarPagamento = useCallback(async () => {
    if (!orderNsu) {
      setVerificandoPagamento(false);
      setErro("Não encontramos o identificador do seu pagamento.");
      return false;
    }

    try {
      const resultado = await consultarPagamento({ data: { orderNsu } });
      const pago = resultado.status === "pago";
      setPagamentoConfirmado(pago);
      if (resultado.status === "erro" || resultado.status === "cancelado") {
        setErro("O pagamento não foi aprovado. Se precisar, volte e tente novamente.");
      }
      return pago;
    } catch {
      setErro("Não foi possível confirmar o pagamento agora. Tentaremos novamente.");
      return false;
    } finally {
      setVerificandoPagamento(false);
    }
  }, [orderNsu]);

  const carregar = useCallback(async () => {
    if (!pagamentoConfirmado) return;
    setCarregando(true);
    try {
      const lista = await listarAgenda();
      setDias(lista);
    } catch {
      setErro("Não foi possível carregar a agenda agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [pagamentoConfirmado]);

  useEffect(() => {
    let ativo = true;
    let timer: number | undefined;

    const checar = async () => {
      const pago = await verificarPagamento();
      if (!ativo) return;
      if (!pago) timer = window.setTimeout(checar, 3000);
    };

    void checar();
    return () => {
      ativo = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [verificarPagamento]);

  useEffect(() => {
    if (pagamentoConfirmado) void carregar();
  }, [pagamentoConfirmado, carregar]);

  const confirmar = async () => {
    if (!diaSel || !horaSel || !pagamentoConfirmado) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await criarAgendamento({
        data: {
          nome,
          whatsapp,
          data: diaSel,
          horario: horaSel,
          plano,
          formaPagamento: pagamento,
          orderNsu,
        },
      });
      if (res.ok) {
        setConfirmado(true);
        setConfirmacao({ data: diaSel, horario: horaSel });
        onConfirmado(diaSel, horaSel);
      } else {
        setErro(res.erro);
        setHoraSel("");
        await carregar();
      }
    } catch {
      setErro("Não foi possível confirmar agora. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const abrirWhatsApp = () => {
    if (!confirmacao) return;
    const mensagem = [
      "🏋️ AGENDAMENTO CONFIRMADO",
      "",
      `Nome: ${nome}`,
      `Plano: ${plano}`,
      `Data: ${formatarData(confirmacao.data)}`,
      `Horário: ${confirmacao.horario}`,
      "",
      "Pagamento confirmado automaticamente pela InfinitePay. 💗",
    ].join("\n");
    window.open(
      `https://wa.me/5511940110447?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (confirmado && confirmacao) {
    return (
      <div className="rounded-2xl border border-whatsapp/50 bg-accent/40 p-5 text-center">
        <p className="font-display text-2xl italic text-primary">Agendamento confirmado!</p>
        <p className="mt-1 text-sm text-muted-foreground">Seu horário foi reservado com sucesso.</p>
        <p className="mt-3 text-sm font-semibold">
          {formatarData(confirmacao.data)} às {confirmacao.horario}
        </p>
        <p className="text-sm text-muted-foreground">{plano}</p>
        <button
          type="button"
          onClick={abrirWhatsApp}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-bold uppercase tracking-wide text-whatsapp-foreground"
        >
          <MessageCircle className="h-4 w-4" /> Avisar a Juliana pelo WhatsApp
        </button>
      </div>
    );
  }

  if (verificandoPagamento || !pagamentoConfirmado) {
    return (
      <div className="mt-4 rounded-2xl border border-primary/30 bg-accent/40 p-5 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 font-display text-xl italic text-primary">Confirmando seu pagamento...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Assim que a InfinitePay confirmar o pagamento, os horários disponíveis aparecerão aqui automaticamente.
        </p>
        {erro && <p className="mt-3 text-sm font-semibold text-destructive">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <p className="font-display text-2xl italic text-primary">Pagamento confirmado! 💗</p>
        <p className="text-sm text-muted-foreground">Agora escolha o melhor dia e horário para o seu atendimento.</p>
      </div>

      {carregando && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando a agenda...
        </p>
      )}

      {!carregando && dias.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum horário disponível no momento.</p>
      )}

      {dias.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dias.map((d) => {
            const livre = d.slots.some((s) => !s.ocupado);
            const ativo = diaSel === d.data;
            return (
              <button
                key={d.data}
                type="button"
                disabled={!livre}
                onClick={() => {
                  setDiaSel(d.data);
                  setHoraSel("");
                }}
                className={[
                  "shrink-0 rounded-xl border px-4 py-3 text-sm transition-colors",
                  ativo
                    ? "border-primary bg-accent font-semibold text-accent-foreground"
                    : "border-border bg-card text-foreground",
                  livre ? "" : "opacity-40",
                ].join(" ")}
              >
                {d.rotulo}
              </button>
            );
          })}
        </div>
      )}

      {diaSel && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {dias
            .find((d) => d.data === diaSel)
            ?.slots.map((s) => {
              const ativo = horaSel === s.horario;
              return (
                <button
                  key={s.horario}
                  type="button"
                  disabled={s.ocupado}
                  onClick={() => setHoraSel(s.horario)}
                  className={[
                    "rounded-xl border px-2 py-3 text-sm transition-all",
                    s.ocupado
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60"
                      : ativo
                        ? "border-primary bg-primary font-bold text-primary-foreground"
                        : "border-border bg-card text-foreground",
                  ].join(" ")}
                >
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {s.horario}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">
                      {s.ocupado ? "Ocupado" : "Disponível"}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {erro && <p className="text-sm font-semibold text-destructive">{erro}</p>}

      {diaSel && horaSel && (
        <div className="rounded-2xl border border-primary/40 bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CalendarHeart className="h-4 w-4" /> Seu agendamento
          </p>
          <p className="mt-2 text-sm">Data: {formatarData(diaSel)}</p>
          <p className="text-sm">Horário: {horaSel}</p>
          <p className="text-sm">Plano: {plano}</p>
          <button
            type="button"
            disabled={salvando}
            onClick={confirmar}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-4 text-sm font-bold uppercase tracking-wide text-whatsapp-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {salvando ? "Reservando..." : "Confirmar agendamento"}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => void carregar()}
        className="flex items-center justify-center gap-2 text-xs font-semibold text-primary underline underline-offset-4"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Atualizar horários
      </button>
    </div>
  );
}
