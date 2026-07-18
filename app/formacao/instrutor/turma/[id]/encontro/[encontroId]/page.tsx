import { notFound } from "next/navigation";
import { getEncontroCondutorContext } from "@/lib/db/formacao";
import { EncontroCondutor } from "@/components/formacao/instrutor/encontro-condutor";

export const dynamic = "force-dynamic";

export default async function EncontroCondutorPage({
  params,
}: {
  params: Promise<{ id: string; encontroId: string }>;
}) {
  const { id: turmaId, encontroId } = await params;

  const context = await getEncontroCondutorContext(encontroId, turmaId);
  if (!context) notFound();

  return <EncontroCondutor context={context} />;
}
