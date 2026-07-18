import { notFound } from "next/navigation";
import { getTurmaById, getRotacaoInstrutorContext } from "@/lib/db/formacao";
import { RotacaoInstrutor } from "@/components/formacao/instrutor/rotacao-instrutor";

export const dynamic = "force-dynamic";

export default async function RotacaoInstrutorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const turma = await getTurmaById(id);
  if (!turma) notFound();

  const context = await getRotacaoInstrutorContext(turma);

  return <RotacaoInstrutor turmaId={id} turmaNome={turma.nome} context={context} />;
}
