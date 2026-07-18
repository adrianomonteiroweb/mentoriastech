import { notFound, redirect } from "next/navigation";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import { getTarefaParaMembro } from "@/lib/db/formacao";
import { TaskDetail } from "@/components/formacao/aluno/task-detail";

export const dynamic = "force-dynamic";

export default async function TarefaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getMenteeAccessSession();
  if (!session) redirect("/minhas-mentorias");

  const { id } = await params;
  const acesso = await getTarefaParaMembro(id, session.email);
  if (!acesso) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <TaskDetail detalhe={acesso.detalhe} membroId={acesso.membro.id} />
    </div>
  );
}
