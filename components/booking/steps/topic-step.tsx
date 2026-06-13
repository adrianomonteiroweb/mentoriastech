"use client";

import { useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepNavigation } from "../step-navigation";

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

  // Separate paid (shown first for anchoring bias) and free topics
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
        {/* Paid topics first — anchoring bias: seeing the paid option first 
            makes the free option feel like an excellent deal */}
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

        {/* Visual separator between paid and free */}
        {paidTopics.length > 0 && freeTopics.length > 0 && (
          <div className="flex items-center gap-3 py-1" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              ou grátis
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Free topics */}
        {freeTopics.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {freeTopics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                isSelected={selectedTopicId === topic.id}
                onSelect={() => handleSelect(topic)}
                isPopular={index === 0}
                availableSlots={availableFreeSlots}
              />
            ))}
          </div>
        )}
      </div>

      {/* Scarcity cue — loss aversion */}
      {availableFreeSlots !== undefined &&
        availableFreeSlots > 0 &&
        availableFreeSlots <= 3 && (
          <p className="text-xs font-medium text-amber-400" aria-live="polite">
            ⚡ Apenas {availableFreeSlots}{" "}
            {availableFreeSlots === 1
              ? "horário disponível"
              : "horários disponíveis"}{" "}
            esta semana
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
  const priceLabel =
    isPaid && topic.amountCents
      ? formatPrice(topic.amountCents, topic.currency)
      : null;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${topic.name}. ${isPaid ? `Mentoria paga, ${priceLabel}` : "Mentoria gratuita"}`}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3 text-left transition-all duration-200",
        "min-h-[56px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.02]"
          : "border-border bg-card hover:border-muted-foreground/30",
      )}
    >
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
          {/* Value framing for paid — what's included */}
          {isPaid && (
            <span className="text-xs text-muted-foreground/80 italic">
              Sessão aprofundada com foco personalizado
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
