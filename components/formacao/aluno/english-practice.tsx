"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { DailyInglesContext } from "@/lib/db/formacao";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type PracticeState = "idle" | "practicing" | "complete";

export function EnglishPractice({ context }: { context: DailyInglesContext }) {
  const router = useRouter();
  const { encontro, ingles } = context;

  const [textoPt, setTextoPt] = useState(ingles?.fraseCompletaPt ?? "");
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState(ingles?.fraseCompletaEn ?? "");
  const [incrementos, setIncrementos] = useState<string[]>(ingles?.incrementos ?? []);
  const [vocab, setVocab] = useState<string[]>(ingles?.vocab ?? []);

  // Practice state
  const [practiceState, setPracticeState] = useState<PracticeState>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const hasTranslation = translation.length > 0;
  const totalSteps = incrementos.length;

  async function traduzir() {
    if (!encontro || !textoPt.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/formacao/daily-ingles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encontroId: encontro.id, textoPt: textoPt.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro na tradução");
      setTranslation(json.data.fraseCompletaEn ?? "");
      setIncrementos(json.data.incrementos ?? []);
      setVocab(json.data.vocab ?? []);
      setPracticeState("idle");
      setCurrentStep(0);
      toast.success("Tradução pronta! Agora pratique.");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro na tradução");
    } finally {
      setTranslating(false);
    }
  }

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Seu navegador não suporta reprodução de áudio.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google"),
    ) ?? voices.find((v) => v.lang.startsWith("en-US"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  function startPractice() {
    setPracticeState("practicing");
    setCurrentStep(0);
    if (incrementos.length > 0) speak(incrementos[0]);
  }

  function next() {
    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      speak(incrementos[nextStep]);
      if (nextStep === totalSteps - 1) {
        setPracticeState("complete");
      }
    }
  }

  function prev() {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      speak(incrementos[prevStep]);
    }
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPracticeState("idle");
    setCurrentStep(0);
  }

  function replay() {
    speak(incrementos[currentStep]);
  }

  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  if (!encontro) {
    return (
      <div className="space-y-4">
        <BackHeader />
        <div className="rounded-lg border border-border bg-card p-6 text-center">
          <Languages className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum encontro agendado. A prática de inglês estará disponível quando
            houver um encontro futuro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <BackHeader />

      {/* Contexto motivacional (viés: por que antes de como) */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
          Por que praticar inglês
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Dailies em inglês preparam você para ambientes de trabalho reais.
          A repetição incremental — palavra por palavra — fixa pronúncia e estrutura
          sem sobrecarga cognitiva. Você controla o ritmo.
        </p>
      </section>

      {/* Input: escrever livremente em PT */}
      <section className="rounded-xl border border-border bg-card p-5">
        <label className="text-sm font-semibold">
          Escreva sua frase do dia em português
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          O que você fez, está fazendo ou fará — como diria na daily.
        </p>
        <Textarea
          value={textoPt}
          onChange={(e) => setTextoPt(e.target.value)}
          placeholder="Ex: Eu criei um novo formulário para cadastrar leads."
          rows={3}
          className="mt-3"
          maxLength={500}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {textoPt.length}/500
          </span>
          <Button
            onClick={traduzir}
            disabled={translating || textoPt.trim().length < 3 || !encontro}
            size="sm"
          >
            {translating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Traduzindo...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Traduzir com IA
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Tradução + Prática incremental */}
      {hasTranslation && (
        <section className="space-y-4">
          {/* Frase completa */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Tradução</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(translation)}
                disabled={speaking}
                aria-label="Ouvir frase completa"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-lg font-medium leading-relaxed">
              {translation}
            </p>
            <p className="mt-1 text-xs text-muted-foreground italic">
              {textoPt}
            </p>
          </div>

          {/* Vocab badges */}
          {vocab.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vocab.map((word) => (
                <button
                  key={word}
                  onClick={() => speak(word)}
                  className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-600 transition-colors hover:bg-cyan-500/20 dark:text-cyan-400"
                  aria-label={`Ouvir: ${word}`}
                >
                  <Volume2 className="h-2.5 w-2.5" />
                  {word}
                </button>
              ))}
            </div>
          )}

          {/* Prática incremental */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Prática incremental</h3>
              {practiceState !== "idle" && (
                <Badge variant="secondary" className="text-[10px]">
                  {currentStep + 1}/{totalSteps}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ouça e repita palavra por palavra. Cada passo adiciona uma palavra.
            </p>

            {practiceState === "idle" && (
              <Button onClick={startPractice} className="mt-4 w-full" size="lg">
                <Play className="mr-2 h-4 w-4" />
                Começar prática
              </Button>
            )}

            {practiceState !== "idle" && (
              <div className="mt-4 space-y-4">
                {/* Progresso visual (efeito Zeigarnik) */}
                <Progress
                  value={((currentStep + 1) / totalSteps) * 100}
                  className="h-2"
                />

                {/* Frase parcial com destaque da última palavra */}
                <div className="min-h-[60px] rounded-lg bg-secondary/60 p-4">
                  <p className="text-center text-xl font-semibold leading-relaxed">
                    {incrementos[currentStep]?.split(" ").map((word, i, arr) => (
                      <span
                        key={i}
                        className={
                          i === arr.length - 1
                            ? "text-primary underline decoration-primary/50 underline-offset-4"
                            : ""
                        }
                      >
                        {i > 0 ? " " : ""}
                        {word}
                      </span>
                    ))}
                  </p>
                </div>

                {/* Controles */}
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prev}
                    disabled={currentStep === 0}
                    aria-label="Voltar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={replay}
                    disabled={speaking}
                    aria-label="Repetir"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => speak(incrementos[currentStep])}
                    disabled={speaking}
                    aria-label="Ouvir"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                  {currentStep < totalSteps - 1 ? (
                    <Button size="icon" onClick={next} aria-label="Próximo">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="default"
                      onClick={stop}
                      aria-label="Concluir"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Botão parar */}
                <div className="text-center">
                  <button
                    onClick={stop}
                    className="text-xs text-muted-foreground underline hover:text-foreground"
                  >
                    Parar e ver frase completa
                  </button>
                </div>
              </div>
            )}

            {/* Feedback de conclusão (micro-recompensa) */}
            {practiceState === "complete" && (
              <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Prática completa! Tente repetir a frase inteira sem apoio.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function BackHeader() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/formacao/turma"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-lg font-semibold">Prática de inglês</h1>
        <p className="text-sm text-muted-foreground">
          Repetição incremental — palavra por palavra
        </p>
      </div>
    </div>
  );
}
