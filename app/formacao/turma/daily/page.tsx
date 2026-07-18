import { redirect } from "next/navigation";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import {
  getActiveTurmaMembershipForEmail,
  getDailyContext,
} from "@/lib/db/formacao";
import { DailyPanel } from "@/components/formacao/aluno/daily-panel";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const session = await getMenteeAccessSession();
  if (!session) redirect("/minhas-mentorias");

  const membership = await getActiveTurmaMembershipForEmail(session.email);
  if (!membership) redirect("/formacao");

  const context = await getDailyContext(membership.turma, membership.membro);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <DailyPanel context={context} />
    </div>
  );
}
