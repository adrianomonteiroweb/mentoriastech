import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de uso da plataforma MentoriasTech. Regras, responsabilidades e condições de uso dos serviços.",
  alternates: { canonical: "/termos-de-uso" },
  openGraph: {
    title: "Termos de Uso | MentoriasTech",
    description:
      "Regras, responsabilidades e condições de uso da plataforma MentoriasTech.",
    url: `${SITE_URL}/termos-de-uso`,
    type: "website",
  },
}

export default function TermosDeUsoPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
        Termos de Uso
      </h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Última atualização: julho de 2025
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            1. Aceite dos Termos
          </h2>
          <p>
            Ao acessar e utilizar a plataforma MentoriasTech, você concorda com
            estes Termos de Uso. Caso não concorde, por favor, não utilize nossos
            serviços.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            2. Descrição da Plataforma
          </h2>
          <p>
            A MentoriasTech é uma plataforma gratuita de mentorias em tecnologia
            que oferece:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Mentorias individuais gratuitas e pagas sobre carreira em
              tecnologia, desenvolvimento web, automações RPA e preparação para
              entrevistas.
            </li>
            <li>
              Ferramentas de inteligência artificial para melhoria de currículo
              e perfil do LinkedIn.
            </li>
            <li>
              Curadoria de vagas de emprego em tecnologia, nacionais e
              internacionais.
            </li>
            <li>
              Biblioteca de conteúdos educacionais (artigos, PDFs, vídeos e
              links).
            </li>
            <li>
              Trilhas de recolocação profissional com etapas estruturadas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            3. Cadastro e Conta
          </h2>
          <p>
            Para acessar funcionalidades completas, é necessário criar uma conta
            com e-mail e senha válidos. Você é responsável por manter a
            confidencialidade de suas credenciais e por todas as atividades
            realizadas em sua conta.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            4. Mentorias
          </h2>
          <p>
            As mentorias gratuitas estão sujeitas à disponibilidade de horários.
            Ao agendar uma mentoria, você se compromete a comparecer no horário
            escolhido. Cancelamentos devem ser comunicados com antecedência.
            Mentorias pagas seguem a política de pagamento e reembolso vigente.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            5. Ferramentas de IA
          </h2>
          <p>
            As ferramentas de IA (melhoria de currículo, otimização de LinkedIn)
            fornecem sugestões automatizadas baseadas em inteligência artificial.
            Os resultados são orientativos e não constituem garantia de
            resultados profissionais. Recomendamos que você revise todas as
            sugestões antes de aplicá-las.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            6. Vagas de Emprego
          </h2>
          <p>
            As vagas exibidas na plataforma são curadas e compartilhadas pela
            comunidade. A MentoriasTech não é responsável pelo processo seletivo,
            pelas condições de trabalho ou pela veracidade das informações
            publicadas por terceiros. Recomendamos que você verifique
            diretamente com a empresa contratante.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            7. Conteúdos e Propriedade Intelectual
          </h2>
          <p>
            Os conteúdos da plataforma (textos, artigos, ferramentas, design)
            são de propriedade da MentoriasTech ou de seus respectivos autores.
            É proibida a reprodução, distribuição ou uso comercial sem
            autorização prévia. Conteúdos sugeridos por usuários podem ser
            publicados com curadoria editorial.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            8. Conduta do Usuário
          </h2>
          <p>Ao utilizar a plataforma, você se compromete a:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Fornecer informações verdadeiras e atualizadas.</li>
            <li>
              Não utilizar a plataforma para fins ilegais, fraudulentos ou
              abusivos.
            </li>
            <li>
              Respeitar os demais usuários, mentores e a equipe da plataforma.
            </li>
            <li>
              Não tentar acessar áreas restritas ou comprometer a segurança do
              sistema.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            9. Limitação de Responsabilidade
          </h2>
          <p>
            A MentoriasTech disponibiliza seus serviços &ldquo;como
            estão&rdquo;, sem garantias de resultados profissionais. Não nos
            responsabilizamos por danos indiretos decorrentes do uso da
            plataforma, incluindo perda de oportunidades ou decisões tomadas com
            base em conteúdos ou sugestões da IA.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            10. Alterações nos Termos
          </h2>
          <p>
            Estes termos podem ser atualizados a qualquer momento. Alterações
            significativas serão comunicadas por meio da plataforma. O uso
            continuado após alterações constitui aceite dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            11. Contato
          </h2>
          <p>
            Dúvidas sobre estes termos podem ser direcionadas para:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">E-mail:</strong>{" "}
              contato@mentoriastech.com.br
            </li>
            <li>
              <strong className="text-foreground">LinkedIn:</strong>{" "}
              <a
                href="https://www.linkedin.com/company/mentoriastech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                /company/mentoriastech
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            12. Foro
          </h2>
          <p>
            Fica eleito o foro da comarca do domicílio do usuário para dirimir
            eventuais controvérsias decorrentes destes Termos de Uso, conforme
            previsto no Código de Defesa do Consumidor.
          </p>
        </section>
      </div>

      <div className="mt-12 border-t border-border pt-6">
        <Link
          href="/"
          className="text-sm text-primary hover:underline underline-offset-2"
        >
          Voltar para a página inicial
        </Link>
      </div>
    </main>
  )
}
