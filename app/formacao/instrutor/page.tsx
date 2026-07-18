import { listarTurmas } from "@/lib/db/formacao";
import { TurmasDashboard } from "@/components/formacao/instrutor/turmas-dashboard";

export const dynamic = "force-dynamic";

export default async function InstrutorPage() {
  const turmas = await listarTurmas();
  return <TurmasDashboard turmasIniciais={turmas} />;
}
