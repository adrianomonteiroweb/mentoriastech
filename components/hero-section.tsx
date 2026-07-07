import { ArrowDown, Check, Gift, ShieldCheck, Sparkles } from "lucide-react";

const DELIVERABLES = [
  "Análise do LinkedIn",
  "Revisão de currículo",
  "Busca de vagas",
  "Preparo p/ entrevistas",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* brilho da marca, apenas decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="mx-auto max-w-3xl px-4 pb-2 pt-6 sm:px-6 sm:pt-10">
        {/* Posicionamento */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Mentorias para carreira em tecnologia
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gift className="h-3.5 w-3.5 text-primary" />
            Gratuita
          </span>
        </div>

        <h1 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Sua mentoria <span className="text-primary">gratuita</span> para
          conquistar a vaga em tech
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
          Em uma conversa, revisamos juntos seu LinkedIn, seu currículo, sua
          estratégia de busca de vagas e preparamos você para as entrevistas.
        </p>

        {/* Entregáveis concretos */}
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {DELIVERABLES.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium"
            >
              <Check className="h-4 w-4 shrink-0 text-primary" />
              {item}
            </li>
          ))}
        </ul>

        {/* CTA principal (o dock inferior é o alvo de polegar no mobile) */}
        <a
          href="#booking"
          className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          Solicitar minha mentoria gratuita
          <ArrowDown className="h-4 w-4" />
        </a>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          100% gratuita · sem compromisso
        </p>
      </div>
    </section>
  );
}
