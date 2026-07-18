import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isFormacaoPreviewEnabled } from "@/lib/formacao/preview";

export const metadata: Metadata = {
  title: "Órbita — Formação em Squad",
  robots: { index: false, follow: false },
};

export default function FormacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enquanto em desenvolvimento, o curso só existe com o gate ligado.
  // Em produção (sem a env), toda a árvore /formacao/* responde 404.
  if (!isFormacaoPreviewEnabled()) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
  );
}
