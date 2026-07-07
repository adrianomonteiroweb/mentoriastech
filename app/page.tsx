import { PlatformLinks } from "@/components/platform-links";
import { HeroSection } from "@/components/hero-section";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThumbDock } from "@/components/thumb-dock";
import { MentorshipRequestTabs } from "@/components/booking/mentorship-request-tabs";
import { FreeSlotsNotice } from "@/components/booking/free-slots-notice";
import { PageViewTracker } from "@/components/page-view-tracker";
import { CalendarDays } from "lucide-react";

export default function Page() {
  return (
    <>
      <PageViewTracker path="/" />
      <SiteHeader />

      <main className="pb-6">
        <HeroSection />

        <PlatformLinks />

        <section
          id="booking"
          aria-label="Solicitar mentoria"
          className="mx-auto w-full max-w-xl scroll-mt-20 px-4 py-6 sm:px-6"
        >
          <div className="mb-5 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Mentoria personalizada
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-xl shadow-black/10 sm:p-6">
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
          </div>
        </section>
      </main>

      <SiteFooter />
      <ThumbDock />
    </>
  );
}
