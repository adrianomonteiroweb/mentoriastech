import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de privacidade da MentoriasTech. Saiba como coletamos, usamos e protegemos seus dados pessoais.",
  alternates: { canonical: "/politica-de-privacidade" },
  openGraph: {
    title: "Política de Privacidade | MentoriasTech",
    description:
      "Saiba como a MentoriasTech coleta, usa e protege seus dados pessoais.",
    url: `${SITE_URL}/politica-de-privacidade`,
    type: "website",
  },
}

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
        Política de Privacidade
      </h1>

      <p className="mb-6 text-sm text-muted-foreground">
        Última atualização: julho de 2025
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            1. Coleta de Dados
          </h2>
          <p>
            A MentoriasTech coleta os seguintes dados pessoais quando você
            utiliza nossa plataforma:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Dados de cadastro:</strong>{" "}
              nome, e-mail e senha para criação de conta.
            </li>
            <li>
              <strong className="text-foreground">Agendamento de mentoria:</strong>{" "}
              nome, e-mail e número de WhatsApp para contato.
            </li>
            <li>
              <strong className="text-foreground">Currículo:</strong> arquivo
              enviado para uso nas ferramentas de IA (melhoria de currículo).
            </li>
            <li>
              <strong className="text-foreground">Dados de navegação:</strong>{" "}
              páginas visitadas, eventos de interação e preferências de tema.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            2. Cookies e Tecnologias de Rastreamento
          </h2>
          <p>Utilizamos cookies e tecnologias similares para:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Manter sua sessão autenticada.</li>
            <li>Salvar suas preferências (tema claro/escuro).</li>
            <li>
              Exibir anúncios personalizados por meio do Google AdSense.
            </li>
            <li>Analisar o uso da plataforma para melhorias contínuas.</li>
          </ul>
          <p className="mt-3">
            O Google utiliza cookies para exibir anúncios com base em visitas
            anteriores ao nosso site e a outros sites. Você pode desativar a
            publicidade personalizada acessando as{" "}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Configurações de Anúncios do Google
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            3. Uso dos Dados
          </h2>
          <p>Seus dados são utilizados para:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Viabilizar o agendamento e a realização de mentorias gratuitas e
              pagas.
            </li>
            <li>
              Processar currículos nas ferramentas de IA (os dados não são
              armazenados permanentemente).
            </li>
            <li>Enviar notificações relacionadas a mentorias agendadas.</li>
            <li>Curar e personalizar conteúdos e vagas exibidos.</li>
            <li>Melhorar a experiência de uso da plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            4. Compartilhamento de Dados
          </h2>
          <p>
            Não vendemos seus dados pessoais. Compartilhamos informações apenas
            com:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Google AdSense:</strong> dados
              de navegação para exibição de anúncios.
            </li>
            <li>
              <strong className="text-foreground">Supabase:</strong>{" "}
              armazenamento seguro de dados com criptografia e controle de
              acesso por linha (RLS).
            </li>
            <li>
              <strong className="text-foreground">Vercel:</strong> hospedagem
              da plataforma e armazenamento de arquivos.
            </li>
            <li>
              <strong className="text-foreground">Google Gemini:</strong>{" "}
              processamento de currículos e transcrições (dados não são retidos
              pela API).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            5. Armazenamento e Segurança
          </h2>
          <p>
            Seus dados são armazenados em servidores seguros com criptografia em
            trânsito (HTTPS/TLS). Utilizamos Row Level Security (RLS) no banco
            de dados para garantir que cada usuário acesse apenas seus próprios
            dados. Arquivos enviados são armazenados com tokens de acesso
            individuais.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            6. Seus Direitos (LGPD)
          </h2>
          <p>
            Em conformidade com a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018), você tem direito a:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Acesso:</strong> solicitar
              uma cópia dos dados pessoais que mantemos sobre você.
            </li>
            <li>
              <strong className="text-foreground">Correção:</strong> solicitar
              a correção de dados incompletos ou incorretos.
            </li>
            <li>
              <strong className="text-foreground">Exclusão:</strong> solicitar
              a exclusão dos seus dados pessoais.
            </li>
            <li>
              <strong className="text-foreground">Portabilidade:</strong>{" "}
              solicitar a transferência dos seus dados para outro serviço.
            </li>
            <li>
              <strong className="text-foreground">Revogação:</strong> retirar
              seu consentimento a qualquer momento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">
            7. Contato
          </h2>
          <p>
            Para exercer seus direitos ou esclarecer dúvidas sobre esta
            política, entre em contato conosco:
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
            8. Alterações nesta Política
          </h2>
          <p>
            Esta política pode ser atualizada periodicamente. Recomendamos que
            você a consulte regularmente. Alterações significativas serão
            comunicadas por meio da plataforma.
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
