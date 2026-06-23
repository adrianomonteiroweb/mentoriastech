import { Clock } from "lucide-react";

/**
 * Aviso estático de escassez das vagas gratuitas (posicionamento de marketing).
 * Não usa dados ao vivo — comunica que apenas ~20% da agenda mensal é gratuita,
 * acionando escassez + loss aversion antes do usuário entrar no formulário.
 */
export function FreeSlotsNotice() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
    >
      <Clock
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-amber-200">
          Vagas gratuitas são limitadas
        </span>
        <p className="text-xs leading-relaxed text-amber-100/80">
          Reservamos cerca de{" "}
          <strong className="font-semibold text-amber-100">
            20% da agenda de cada mês
          </strong>{" "}
          para mentorias gratuitas. Quando elas se esgotam, novas vagas só abrem
          no mês seguinte — garanta a sua.
        </p>
      </div>
    </div>
  );
}
