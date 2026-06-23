"use client";

import { useRef, useState } from "react";
import type { TopicItem } from "@/lib/types/booking";
import {
  BookOpen,
  Loader2,
  Languages,
  Code,
  Briefcase,
  MessageSquare,
  Search,
  Zap,
  Globe,
  Sparkles,
  Star,
  Crown,
  Check,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { StepNavigation } from "../step-navigation";

// Benefícios das mentorias pagas — enquadramento de diferencial competitivo.
const PAID_BENEFITS = [
  "Plano de ação personalizado",
  "Acompanhamento próximo",
  "Saia na frente no processo seletivo",
];

const topicIcons: Record<string, React.ReactNode> = {
  "praticar inglês": <Languages className="h-5 w-5" aria-hidden="true" />,
  "programação para outras profissões": (
    <Code className="h-5 w-5" aria-hidden="true" />
  ),
  "carreira em programação": (
    <Briefcase className="h-5 w-5" aria-hidden="true" />
  ),
  "preparação para entrevistas": (
    <MessageSquare className="h-5 w-5" aria-hidden="true" />
  ),
  "busca de oportunidades": <Search className="h-5 w-5" aria-hidden="true" />,
  "desenvolvimento web": <Globe className="h-5 w-5" aria-hidden="true" />,
  "automações rpa": <Zap className="h-5 w-5" aria-hidden="true" />,
};

function getIconForTopic(topicName: string): React.ReactNode {
  const lowerName = topicName.toLowerCase();
  for (const [key, icon] of Object.entries(topicIcons)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }
  return <BookOpen className="h-5 w-5" aria-hidden="true" />;
}

function formatPrice(amountCents: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

interface TopicStepProps {
  topics: TopicItem[];
  selectedTopicId: string;
  loading: boolean;
  availableFreeSlots?: number;
  onSelect: (
    topicId: string,
    topicName: string,
    category: "free" | "paid",
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TopicStep({
  topics,
  selectedTopicId,
  loading,
  availableFreeSlots,
  onSelect,
  onNext,
  onBack,
}: TopicStepProps) {
  const announceRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando temas...
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <BookOpen
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          Nenhum tema disponível no momento.
        </p>
        <StepNavigation
          onBack={onBack}
          onNext={onNext}
          canGoNext={false}
          isFirst={true}
          isLast={false}
        />
      </div>
    );
  }

  // Free topics shown first, paid topics after
  const paidTopics = topics.filter((t) => t.category === "paid");
  const freeTopics = topics.filter((t) => t.category === "free");

  function handleSelect(topic: TopicItem) {
    onSelect(topic.id, topic.name, topic.category);

    // Announce selection for screen readers
    if (announceRef.current) {
      announceRef.current.textContent = `${topic.name} selecionado. ${topic.category === "paid" ? "Mentoria paga." : "Mentoria gratuita."}`;
    }

    // Auto-advance with reduced motion respect
    const delay = prefersReducedMotion ? 0 : 400;
    setTimeout(onNext, delay);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Screen reader live region for selection announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <p className="text-sm text-muted-foreground">
        Sobre qual assunto gostaria de conversar?
      </p>

      <div
        className="flex flex-col gap-3"
        role="radiogroup"
        aria-label="Temas de mentoria disponíveis"
      >
        {/* Free topics first (vagas limitadas) */}
        {freeTopics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {freeTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopicId === topic.id}
                onSelect={() => handleSelect(topic)}
                isPopular={topic.name
                  .toLowerCase()
                  .includes("busca de oportunidades")}
                availableSlots={availableFreeSlots}
              />
            ))}
          </div>
        )}

        {/* Visual separator between free and paid */}
        {freeTopics.length > 0 && paidTopics.length > 0 && (
          <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ou vá além: mentorias pagas
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Paid topics after */}
        {paidTopics.length > 0 && (
          <div className="flex flex-col gap-2">
            {paidTopics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopicId === topic.id}
                onSelect={() => handleSelect(topic)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scarcity cue — loss aversion. O contador cobre o horizonte de 16 semanas
          (não só "esta semana"), então o texto não afirma uma janela específica. */}
      {availableFreeSlots !== undefined &&
        availableFreeSlots > 0 &&
        availableFreeSlots <= 3 && (
          <p
            className="flex items-center gap-1.5 text-xs font-medium text-amber-300"
            aria-live="polite"
          >
            <Zap className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Restam poucas vagas gratuitas em aberto — garanta a sua.
          </p>
        )}

      <StepNavigation
        onBack={onBack}
        onNext={onNext}
        canGoNext={!!selectedTopicId}
        isFirst={true}
        isLast={false}
      />
    </div>
  );
}

// ─── Individual Topic Card ────────────────────────────────────────────────────

interface TopicCardProps {
  topic: TopicItem;
  isSelected: boolean;
  onSelect: () => void;
  isPopular?: boolean;
  availableSlots?: number;
}

function TopicCard({ topic, isSelected, onSelect, isPopular }: TopicCardProps) {
  const isPaid = topic.category === "paid";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const priceLabel =
    isPaid && topic.amountCents
      ? formatPrice(topic.amountCents, topic.currency)
      : null;

  const ariaLabel = `${topic.name}. ${isPaid ? `Mentoria paga, ${priceLabel}` : "Mentoria gratuita"}`;

  const selectFromModal = () => {
    setDetailsOpen(false);
    onSelect();
  };

  const cardBody = (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "flex-shrink-0 mt-0.5",
          isPaid ? "text-amber-400" : "text-primary/80",
        )}
      >
        {getIconForTopic(topic.name)}
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-foreground leading-tight">
            {topic.name}
          </span>
          {/* Price/free tag — uses color + text + border + icon for non-color-only differentiation */}
          {isPaid ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-bold uppercase text-amber-300"
              aria-label={`Preço: ${priceLabel}`}
            >
              <Star className="h-3 w-3" aria-hidden="true" />
              {priceLabel}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-bold uppercase text-emerald-300"
              aria-label="Mentoria gratuita"
            >
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Grátis
            </span>
          )}
          {/* Selo premium — framing de diferencial de mercado (ícone+texto, não-só-cor) */}
          {isPaid && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
              aria-label="Mentoria essencial para se diferenciar no mercado"
            >
              <Crown className="h-3 w-3" aria-hidden="true" />
              Essencial
            </span>
          )}
          {/* Social proof — recommendation bias */}
          {isPopular && !isPaid && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              aria-label="Tema mais popular"
            >
              Mais popular
            </span>
          )}
        </div>
        {/* Description — progressive disclosure: always visible for clarity */}
        {topic.description && (
          <span className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {topic.description}
          </span>
        )}
        {/* Value framing for paid — diferencial competitivo + benefícios */}
        {isPaid && (
          <div className="mt-0.5 flex flex-col gap-1.5">
            <span className="text-xs font-medium leading-snug text-amber-200/90">
              Mentoria aprofundada para você se destacar e sair na frente no
              mercado.
            </span>
            <ul className="flex flex-col gap-1">
              {PAID_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <Check
                    className="h-3 w-3 flex-shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  // Free topics: o card inteiro seleciona.
  if (!isPaid) {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={ariaLabel}
        onClick={onSelect}
        className={cn(
          "flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200",
          "min-h-[56px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isSelected
            ? "border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.02]"
            : "border-border bg-card hover:border-muted-foreground/30",
        )}
      >
        {cardBody}
      </button>
    );
  }

  // Mentorias pagas: selecionar direto OU abrir modal com mais detalhes.
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-card hover:border-muted-foreground/30",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        aria-label={ariaLabel}
        onClick={onSelect}
        className="flex flex-col gap-2 p-3 text-left min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {cardBody}
      </button>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        aria-label={`Ver mais detalhes sobre ${topic.name}`}
        className="flex min-h-11 items-center justify-center gap-1.5 border-t border-border/60 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Ver mais detalhes
      </button>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] gap-3 overflow-y-auto p-4 sm:p-6">
          {topic.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- imagem de proporção variável; sem corte
            <img
              src={topic.imageUrl}
              alt={topic.name}
              className="mx-auto block max-h-[55vh] w-auto max-w-full rounded-lg border bg-black"
            />
          )}

          {/* CTA de ação rápida — logo abaixo da imagem, acima da dobra.
              Reduz fricção (Lei de Fitts) e dá saliência ao próximo passo. */}
          <div className="flex flex-col items-center gap-1">
            <Button
              type="button"
              size="sm"
              onClick={selectFromModal}
              className="px-8"
            >
              Selecionar esta mentoria
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Garanta seu horário e saia na frente no mercado.
            </p>
          </div>

          <DialogHeader>
            <DialogTitle>{topic.name}</DialogTitle>
            <DialogDescription>
              Mentoria paga{priceLabel ? ` · ${priceLabel}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            {priceLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-bold uppercase text-amber-300">
                <Star className="h-3 w-3" aria-hidden="true" />
                {priceLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Essencial
            </span>
          </div>

          {topic.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {topic.description}
            </p>
          )}

          <div className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <span className="text-sm font-medium leading-snug text-amber-200/90">
              Mentoria aprofundada para você se destacar e sair na frente no
              mercado.
            </span>
            <ul className="flex flex-col gap-1.5">
              {PAID_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Check
                    className="h-3.5 w-3.5 flex-shrink-0 text-amber-400"
                    aria-hidden="true"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDetailsOpen(false)}
            >
              Fechar
            </Button>
            <Button type="button" onClick={selectFromModal}>
              Selecionar esta mentoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
