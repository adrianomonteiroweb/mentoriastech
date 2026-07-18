import { redirect } from "next/navigation";
import { getMenteeAccessSession } from "@/lib/utils/mentee-access";
import { getActiveTurmaMembershipForEmail, getTurmaHome } from "@/lib/db/formacao";
import { TurmaHome } from "@/components/formacao/aluno/turma-home";

export const dynamic = "force-dynamic";

export default async function TurmaPage() {
  const session = await getMenteeAccessSession();
  if (!session) redirect("/minhas-mentorias");

  const membership = await getActiveTurmaMembershipForEmail(session.email);
  if (!membership) redirect("/formacao");

  const home = await getTurmaHome(membership.turma, membership.membro);
  return <TurmaHome home={home} />;
}
