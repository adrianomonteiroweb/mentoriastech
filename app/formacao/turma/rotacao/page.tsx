import { redirect } from "next/navigation";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import { getActiveTurmaMembershipForEmail, getRotacaoContext } from "@/lib/db/formacao";
import { RolesMatrix } from "@/components/formacao/aluno/roles-matrix";

export const dynamic = "force-dynamic";

export default async function RotacaoPage() {
  const session = await getMenteeAccessSession();
  if (!session) redirect("/minhas-mentorias");

  const membership = await getActiveTurmaMembershipForEmail(session.email);
  if (!membership) redirect("/formacao");

  const context = await getRotacaoContext(membership.turma, membership.membro);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <RolesMatrix context={context} />
    </div>
  );
}
