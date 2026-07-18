import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Orbit } from "lucide-react";
import { getProfile } from "@/lib/utils/auth";

// O gate de preview (404) vem do layout pai app/formacao/layout.tsx.
// Aqui garantimos que só admin/mentor acessa a área do instrutor.
export default async function InstrutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login?redirect=/formacao/instrutor");
  }
  if (profile.role !== "admin" && profile.role !== "mentor") {
    redirect("/formacao");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/formacao/instrutor" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Orbit className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">
              Órbita <span className="text-muted-foreground">· Instrutor</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Painel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
