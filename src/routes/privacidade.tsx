import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MarcaCompacta } from "@/components/brand";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · Karate Legends Sparring" },
      {
        name: "description",
        content: "Política preliminar de privacidade e proteção de dados da Karate Legends Sparring.",
      },
      { property: "og:title", content: "Política de Privacidade · Karate Legends Sparring" },
      {
        property: "og:description",
        content: "Como a World League coleta, usa, protege e conserva dados pessoais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Privacidade,
});

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-[15rem_1fr] md:py-10">
      <h2 className="text-lg leading-tight">{titulo}</h2>
      <div className="space-y-4 text-sm leading-7 text-muted-fg">{children}</div>
    </section>
  );
}

function Privacidade() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 md:px-10">
        <Link to="/" aria-label="Karate Legends Sparring">
          <MarcaCompacta />
        </Link>
        <Link to="/termos" className="eyebrow hover:text-foreground">
          Termos
        </Link>
      </header>

      <article className="mx-auto max-w-4xl px-5 pt-14 pb-24 md:px-10 md:pt-20 md:pb-32">
        <p className="eyebrow text-gold-soft">Versão preliminar · 1º de outubro de 2026</p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[0.92] md:text-7xl">Política de privacidade</h1>
        <div className="mt-8 border border-line bg-surface p-5 text-sm leading-relaxed text-foreground/80">
          Este documento é uma versão preliminar e passará por revisão jurídica antes da abertura
          pública definitiva.
        </div>

        <div className="mt-14">
          <Bloco titulo="1. Dados coletados">
            <p>
              No cadastro do atleta, tratamos nome, email, WhatsApp, data de nascimento, graduação,
              clube e unidade escolhidos, senha protegida pelo serviço de autenticação e registros de
              aceite. Aplicações de senseis incluem também informações do clube, cidade, estado,
              graduação, tempo de ensino e Instagram quando informado.
            </p>
          </Bloco>

          <Bloco titulo="2. Para que usamos">
            <p>
              Usamos os dados para criar e proteger a conta, verificar idade mínima, encaminhar a
              solicitação ao clube, administrar vínculos e filiações, organizar a turma, registrar
              presença, calcular o ranking, liberar cursos, comunicar fatos operacionais e atender
              obrigações legais e de segurança.
            </p>
          </Bloco>

          <Bloco titulo="3. O que o clube vê">
            <p>
              O clube ao qual o atleta solicita entrada vê apenas nome, WhatsApp, graduação e status
              da filiação ou autorização. Email, data de nascimento e aceites obrigatórios ficam
              restritos à administração da liga, salvo quando o acesso for necessário por obrigação
              legal ou para resolver uma solicitação do próprio titular.
            </p>
          </Bloco>

          <Bloco titulo="4. Marketing opcional">
            <p>
              O envio de novidades sobre eventos e transmissões PPV depende de consentimento
              opcional. Recusar ou retirar esse consentimento não impede a participação na liga nem o
              recebimento de mensagens essenciais sobre conta, clube, presença, filiação e segurança.
            </p>
          </Bloco>

          <Bloco titulo="5. Check-in e foto da turma">
            <p>
              Na etapa 2, o check-in poderá coletar a localização pontual do aparelho para confirmar
              que ele está próximo à unidade. Não haverá rastreamento contínuo. No modo verificação,
              uma foto da turma poderá ser usada para conferir a chamada e investigar divergências.
              Essa foto não será usada em publicidade sem autorização específica.
            </p>
          </Bloco>

          <Bloco titulo="6. Compartilhamento e proteção">
            <p>
              Os dados são acessados somente por pessoas autorizadas da liga, pelo clube nos limites
              acima e por fornecedores necessários à operação, como infraestrutura, autenticação,
              armazenamento, comunicação e, em etapa futura, pagamentos. Aplicamos controle de
              acesso por papel, registro de operações e proteção das credenciais.
            </p>
          </Bloco>

          <Bloco titulo="7. Tempo de guarda">
            <p>
              Dados da conta e do histórico esportivo são mantidos durante a relação com a liga e,
              após seu término, por até 5 anos quando necessários para obrigações legais, defesa de
              direitos e integridade das temporadas. Pré-inscrições sem conversão são revistas após
              24 meses sem interação. Localização pontual e fotos de verificação serão eliminadas ou
              anonimizadas em até 90 dias, salvo divergência, investigação ou obrigação legal. Registros
              técnicos de acesso podem ser mantidos por até 6 meses.
            </p>
          </Bloco>

          <Bloco titulo="8. Direitos do titular">
            <p>
              O titular pode solicitar confirmação do tratamento, acesso, correção, informação sobre
              compartilhamentos, anonimização, bloqueio ou eliminação quando cabível, portabilidade,
              revisão de decisões, retirada do consentimento de marketing e encerramento da conta.
              Algumas informações podem ser conservadas quando houver obrigação legal ou necessidade
              de defesa de direitos.
            </p>
            <p>
              As solicitações podem ser feitas pelos canais oficiais informados no app. Antes de
              atender um pedido, poderemos confirmar a identidade do solicitante para proteger seus
              dados.
            </p>
          </Bloco>

          <Bloco titulo="9. Atualizações">
            <p>
              A política poderá ser atualizada para refletir novas etapas do produto ou exigências
              legais. Mudanças relevantes serão destacadas no app, com nova data de versão.
            </p>
          </Bloco>
        </div>
      </article>
    </main>
  );
}