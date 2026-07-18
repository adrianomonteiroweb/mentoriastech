import { redirect } from "next/navigation";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import { getActiveTurmaMembershipForEmail, getDailyInglesContext } from "@/lib/db/formacao";
import { EnglishPractice } from "@/components/formacao/aluno/english-practice";

export const dynamic = "force-dynamic";

export default async function InglesPage() {
  const session = await getMenteeAccessSession();
  if (!session) redirect("/minhas-mentorias");

  const membership = await getActiveTurmaMembershipForEmail(session.email);
  if (!membership) redirect("/formacao");

  const context = await getDailyInglesContext(membership.turma, membership.membro);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <EnglishPractice context={context} />
    </div>
  );
}
