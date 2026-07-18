import { notFound } from "next/navigation";
import { getReferencia, getTurmaDetalhe } from "@/lib/db/formacao";
import { TurmaManager } from "@/components/formacao/instrutor/turma-manager";

export const dynamic = "force-dynamic";

export default async function TurmaInstrutorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detalhe, referencia] = await Promise.all([
    getTurmaDetalhe(id),
    getReferencia(),
  ]);

  if (!detalhe) notFound();

  return <TurmaManager detalhe={detalhe} referencia={referencia} />;
}
