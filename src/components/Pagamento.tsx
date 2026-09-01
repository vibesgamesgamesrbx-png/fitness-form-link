import { useEffect, useState } from "react";
import { Check, CreditCard, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { consultarPagamento, criarCheckoutInfinitePay } from "@/lib/pagamento.functions";
import Agenda from "@/components/Agenda";

type Props = {
  nome?: string;
  whatsapp?: string;
  plano?: string;
  pagamento?: string;
  orderNsu?: string;
};

export default function Pagamento({ nome, whatsapp, plano, pagamento, orderNsu }: Props) {
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [status, setStatus] = useState("pendente");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const verificar = async (nsu: string) => {
    const result = await consultarPagamento({ data: { orderNsu: nsu } });
    if (result.ok) {
      setPaymentId(result.id);
      setStatus(result.status);
      return result.status;
    }
    setStatus("inexistente");
    return "inexistente";
  };

  useEffect(() => {
    if (!orderNsu) return;
    let ativo = true;
    let tentativas = 0;

    const poll = async () => {
      tentativas += 1;
      const atual = await verificar(orderNsu);
      if (!ativo || atual === "pago" || tentativas >= 10) return;
      window.setTimeout(() => void poll(), 2000);
    };

    void poll();
    return () => {
      ativo = false;
    };
  }, [orderNsu]);

  const iniciarPagamento = async () => {
    if (!nome || !whatsapp || !plano || !pagamento) return;
    setCarregando(true);
    setErro("");
    try {
      const result = await criarCheckoutInfinitePay({
        data: { nome, whatsapp, plano, formaPagamento: pagamento },
      });
      setCheckoutUrl(result.checkoutUrl);
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível iniciar o pagamento.");
    } finally {
      setCarregando(false);
    }
  };

  if (orderNsu) {
    if (status === "pago" && paymentId) {
      return (
        <div className="mt-6">
          <div className="mb-4 rounded-2xl border border-whatsapp/50 bg-accent/40 p-4 text-center">
            <Check className="mx-auto h-7 w-7 text-whatsapp" />
            <p className="mt-1 font-semibold text-primary">Pagamento confirmado!</p>
            <p className="text-sm text-muted-foreground">Agora escolha seu horário.</p>
          </div>
          <Agenda pagamentoId={paymentId} />
        </div>
      );
    }

    return (
      <div className="mt-6 rounded-2xl border border-primary/40 bg-card p-5 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
        <p className="mt-2 font-semibold text-primary">Confirmando seu pagamento...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A agenda só será liberada quando a InfinitePay confirmar o pagamento.
        </p>
        <button
          type="button"
          onClick={() => void verificar(orderNsu)}
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
        >
          <RefreshCw className="h-4 w-4" /> Verificar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-primary/40 bg-accent/40 p-5">
      <div className="flex items-center gap-2 text-primary">
        <LockKeyhole className="h-5 w-5" />
        <p className="font-semibold">Pagamento seguro</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        O pagamento será feito diretamente no checkout da InfinitePay. Você poderá escolher Pix ou cartão por lá.
      </p>
      {plano && <p className="mt-3 text-sm font-semibold">Plano: {plano}</p>}
      <button
        type="button"
        disabled={carregando}
        onClick={() => void iniciarPagamento()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60"
      >
        {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
        Ir para o pagamento
      </button>
      {checkoutUrl && <p className="mt-2 text-xs text-muted-foreground">Abrindo checkout...</p>}
      {erro && <p className="mt-3 text-sm font-semibold text-destructive">{erro}</p>}
    </div>
  );
}
