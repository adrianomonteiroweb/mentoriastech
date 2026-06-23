import { PlatformLinks } from "@/components/platform-links";
import { HeroSection } from "@/components/hero-section";
import { ShareButton } from "@/components/share-button";
import { SocialLinks } from "@/components/social-links";
import { MentorshipRequestTabs } from "@/components/booking/mentorship-request-tabs";
import { FreeSlotsNotice } from "@/components/booking/free-slots-notice";
import { CalendarDays } from "lucide-react";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-8 md:py-14">
      <div className="flex w-full max-w-lg flex-col gap-7">
        <HeroSection />

        <SocialLinks />

        <PlatformLinks />

        <ShareButton
          path="/"
          title="MentoriasTech"
          text="Plataforma de mentorias em tecnologia. Conecte-se. Cresça. Transforme."
          label="Compartilhe com alguém"
          tracking={{ type: "page", path: "/", label: "Página principal" }}
          className="w-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
        />

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Mentoria personalizada
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <section
            className="scroll-mt-6 rounded-lg border border-primary/20 bg-card p-5 shadow-xl shadow-black/20 sm:p-6"
            id="booking"
            aria-label="Solicitar mentoria"
          >
            <div className="mb-4 flex flex-col gap-1.5 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                Solicite uma conversa de mentoria
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Escolha um tema e horário. A partir daí, a conversa já começa
                com contexto.
              </p>
            </div>
            <div className="mb-5">
              <FreeSlotsNotice />
            </div>
            <MentorshipRequestTabs />
          </section>
        </div>

        <footer className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">
            {"MentoriasTech"} &middot; {new Date().getFullYear()}
          </p>
          <a
            href="/login"
            className="text-[10px] text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          >
            Área de admin
          </a>
        </footer>
      </div>
    </main>
  );
}
