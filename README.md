# Karate Sparring Hub

KARATE SPARRING · by Legends — PROMPT MESTRE (colar inteiro no Lovable)

Crie um web app completo chamado "Karate Sparring - by Legends" em português do Brasil, mobile-first, usando Lovable Cloud (Supabase) como backend.

CONTEXTO DO PRODUTO

Programa nacional de aulas de sparring de karatê aos sábados. Atletas se inscrevem pelo link do sensei da sua região e treinam presencialmente no dojô dele. Pagamentos acontecem FORA do app, na plataforma Greenn, via redirect para links de afiliado de cada sensei. O app tem três áreas: triagem pública de atletas, página de aplicação para senseis, e painel admin protegido.

DESIGN SYSTEM (seguir à risca, proibido estética genérica de SaaS)

Direção: "dojô noturno de combate". Referência: pôster de luta japonês minimalista. Escuro, pesado, disciplinado.

--bg: #0A0A0B (fundo)

--surface: #131316 (cards)

--text: #F2F0EB (texto principal, branco-osso)

--muted: #8A8880 (texto secundário)

--accent: #C8102E (vermelho: apenas CTAs e no máximo UM elemento de destaque por tela)

--line: #26262B (bordas e divisores)

Tipografia (Google Fonts): títulos em Archivo Black, caixa alta, tracking levemente negativo; corpo em Inter. Marca: wordmark tipográfica "KARATE SPARRING" em Archivo Black com "by Legends" menor em Inter, alinhado à direita abaixo do wordmark. Sem logo de imagem. Identidade: números grandes em destaque tipográfico (estética de calendário de luta), transições de corte seco (sem fades suaves), textura sutil de grão no fundo. Proibido: gradientes coloridos, ilustrações 3D, emojis na interface, componentes shadcn com aparência default sem customização.

BANCO DE DADOS (criar exatamente estas tabelas)

senseis: id uuid pk default gen_random_uuid(), nome text not null, dojo text not null, cidade text not null, uf char(2) not null, whatsapp text not null, email text not null unique, graduacao text, tempo_ensino text, instagram text, foto_url text, status text not null default 'aplicou' (valores: aplicou, aprovado, ativo, inativo), piloto boolean not null default false, link_afiliado_mensal text, link_afiliado_avulso text, data_adesao date, obs text, created_at timestamptz default now()

leads_atletas: id uuid pk default gen_random_uuid(), nome text not null, whatsapp text not null, email text not null, cidade text, uf char(2) not null, sensei_id uuid references senseis(id), produto_escolhido text (mensal, avulso ou null), status text not null default 'lead' (valores: lead, convertido, orfao_conciliado), aceite_lgpd boolean not null default false, greenn_sale_id text, convertido_em timestamptz, created_at timestamptz default now()

webhook_log: id uuid pk default gen_random_uuid(), sale_id text unique, payload jsonb not null, processado boolean default false, resultado text, created_at timestamptz default now()

pagamentos_orfaos: id uuid pk default gen_random_uuid(), sale_id text, email_pagador text, documento_pagador text, payload jsonb, conciliado boolean default false, lead_id uuid references leads_atletas(id), created_at timestamptz default now()

config: chave text pk, valor text. Seed inicial: ('link_adesao_sensei', ''), ('modo_piloto', 'true'), ('inscricoes_abertas', 'true')

SEGURANÇA (RLS)

Todas as tabelas fechadas para anon por padrão.

senseis: select público APENAS de linhas com status = 'ativo', APENAS colunas id, nome, dojo, cidade, uf, graduacao, foto_url. As colunas link_afiliado_mensal e link_afiliado_avulso JAMAIS podem ser lidas pelo cliente público.

senseis: insert público permitido apenas com status = 'aplicou'.

leads_atletas: insert público permitido apenas com aceite_lgpd = true. Sem select público.

webhook_log, pagamentos_orfaos, config: nenhum acesso público.

Usuário autenticado (admin): acesso total.

AUTH: login por email/senha apenas para admin, sem cadastro público de usuários (criarei o admin manualmente no backend). /admin exige login.

PÁGINA / · TRIAGEM DO ATLETA

Wizard de 4 passos numa única rota, transição de corte seco, indicador de progresso discreto (4 traços no topo).

Hero acima do wizard: título "KARATE SPARRING", assinatura "by Legends", subtítulo "Treinos de sparring todos os sábados, no seu estado, com sensei licenciado."

PASSO 1 · Estado. Título "Onde você vai treinar?". Grid de botões com as UFs que possuem pelo menos um sensei status = 'ativo' (se config.modo_piloto = 'true', considerar apenas senseis com piloto = true). Nunca exibir UF sem sensei elegível. Botão secundário: "Meu estado ainda não está aqui" → ramo lista de espera.

PASSO 2 · Sensei. Título "Escolha seu dojô". Cards dos senseis elegíveis da UF: foto (fallback: silhueta escura), nome em destaque, graduação, dojô, cidade. Clique seleciona e avança.

PASSO 3 · Cadastro. Título "Seus dados". Campos: Nome completo (obrigatório), WhatsApp com máscara brasileira (obrigatório), Email (obrigatório, validado), Cidade (opcional). Checkbox obrigatório: "Autorizo o contato e o uso dos meus dados conforme a Política de Privacidade." (link placeholder #). Botão "Continuar".

PASSO 4 · Produto. Título "Como você quer treinar?". Dois cards (empilhados no mobile):

Card destacado com borda --accent: "MENSAL · R$ 100/mês · Todos os sábados do mês", botão "Quero treinar todo sábado"

Card: "AVULSO · R$ 30 · Um sábado para experimentar", botão "Quero experimentar"

Ao clicar: (1) insert do lead em leads_atletas com sensei_id, uf, produto_escolhido, aceite_lgpd = true; (2) chamada à edge function redirect-checkout; (3) redirect do navegador para a URL retornada. URL vazia: exibir "Inscrições para este dojô abrem em breve. Seu cadastro foi salvo e avisaremos você no WhatsApp."

Ramo lista de espera: Nome, WhatsApp, Email, Estado (select 27 UFs), Cidade, checkbox LGPD. Insert com sensei_id = null e produto_escolhido = null. Sucesso: "Você será o primeiro a saber quando o Karate Sparring chegar ao seu estado."

Global: se config.inscricoes_abertas = 'false', os passos 3 e 4 são substituídos pelo formulário de lista de espera (preservando sensei_id quando houver).

PÁGINA /sensei · VENDA + APLICAÇÃO DE SENSEI

Seções na ordem:

Hero: "LEVE O KARATE SPARRING PARA O SEU DOJÔ", assinatura "by Legends", subtítulo "Programa nacional de sparring aos sábados. Você conduz, a metodologia chega pronta toda semana."

Três números em destaque tipográfico grande: "R$ 80 · por aluno mensal, líquido, direto na sua conta" | "R$ 20 · por treino avulso" | "3 alunos · pagam sua adesão anual".

Como funciona, lista numerada: (1) Você recebe acesso à biblioteca de técnicas e ao roteiro de cada sábado; (2) Um vídeo curto por semana ensina você a conduzir o treino; (3) 45 minutos de drills, depois sparring rotativo sob sua gestão; (4) A lição final chega em vídeo e por escrito, com guia de fala; (5) Seus alunos se inscrevem pelo SEU link e o repasse cai automático.

Investimento: "Condição de fundador: 1º ano por R$ 1.800 em até 12x de R$ 150. A partir do 2º ano: R$ 2.400/ano."

Formulário de aplicação: Nome completo, Nome do dojô, Cidade, UF (select), WhatsApp (máscara BR), Email, Graduação (select: 1º Dan a 8º Dan, Outra), Há quantos anos você ensina (select: menos de 5, 5 a 10, 10 a 20, mais de 20), Instagram do dojô (opcional). Insert em senseis com status = 'aplicou'.

Confirmação: "Aplicação recebida. Nossa equipe retorna em até 48h no seu WhatsApp." Não exibir link de pagamento.

PÁGINA /confirmado

Página simples de confirmação pós-pagamento: "Inscrição confirmada. Seu sensei entrará em contato com os detalhes do próximo sábado." Mesmo design system.

PAINEL /admin (autenticado) · 4 ABAS

ABA SENSEIS. Tabela com filtro por status e busca por nome/dojô/UF. Colunas: nome, dojô, cidade/UF, status (badge), piloto (toggle), data de aplicação. Clique abre painel lateral com todos os dados e ações:

"Aprovar" (visível se status = aplicou): status → aprovado.

Campos editáveis: link_afiliado_mensal, link_afiliado_avulso, foto_url, data_adesao, obs.

"Ativar" (visível se status = aprovado): DESABILITADO com aviso "Preencha os dois links de afiliado" enquanto qualquer um dos dois links estiver vazio. Ao ativar: status → ativo.

"Desativar" (visível se status = ativo): status → inativo.

ABA LEADS. Tabela de leads_atletas com filtros por UF, sensei, produto e status, busca por nome/email. Colunas: nome, whatsapp, email, UF, sensei, produto, status (badge), data. Botão "Exportar CSV" respeitando os filtros ativos.

ABA CONCILIAÇÃO. Lista de pagamentos_orfaos não conciliados: email_pagador, sale_id, data, resumo do payload. Ação "Vincular a lead": busca de leads por nome/email; ao vincular, o lead vira status = convertido (com greenn_sale_id e convertido_em) e o órfão vira conciliado = true com lead_id.

ABA CONFIG. Três controles sobre a tabela config: campo "Link de pagamento da Adesão Sensei" (link_adesao_sensei), toggle "Modo piloto" (modo_piloto), toggle "Inscrições abertas" (inscricoes_abertas).

EDGE FUNCTIONS (duas)

redirect-checkout (verify_jwt = false): recebe { lead_id, produto }. Atualiza leads_atletas.produto_escolhido. Busca no servidor o link do sensei do lead (link_afiliado_mensal se 'mensal', link_afiliado_avulso se 'avulso') e retorna { url }. A URL é usada EXATAMENTE como está no banco, sem anexar nenhum parâmetro de query. Links de afiliado nunca transitam em selects públicos, apenas nesta function.

webhook-greenn (verify_jwt = false, CORS liberando o header apikey): recebe webhooks de venda da Greenn.

Validar header x-webhook-token contra o secret GREENN_WEBHOOK_TOKEN (criar o secret; o valor será preenchido depois). Inválido: 401.

Processar apenas event = 'salePaid'; outros eventos: 200 e ignorar.

Idempotência: se sale.id já existe em webhook_log.sale_id, registrar como 'duplicado' e responder 200.

Match em camadas: normalizar client.email (lowercase, trim); buscar lead com esse email e status = 'lead', mais recente primeiro. Match: lead → status 'convertido', greenn_sale_id = sale.id, convertido_em = now(). Sem match: insert em pagamentos_orfaos (sale_id, email_pagador, documento_pagador = client.document, payload completo).

Sempre: insert em webhook_log (sale_id, payload, processado = true, resultado 'matched'/'orfao'/'duplicado') e responder 200. Erros internos: responder 200 mesmo assim e gravar em webhook_log com processado = false.

ACABAMENTO OBRIGATÓRIO

Mobile 390px impecável: wizard sem cortes, área de toque generosa, máscara de WhatsApp com teclado numérico.

Estados vazios: triagem sem nenhum sensei ativo exibe a lista de espera nacional; sensei sem foto usa silhueta escura; falha de rede no insert mostra erro claro sem perder os dados digitados.

SEO: title "Karate Sparring · by Legends", meta description "Treinos de sparring de karatê todos os sábados, com senseis licenciados em todo o Brasil.", og:image placeholder escuro com o wordmark.

Imagens com lazy loading.

Seed de teste: criar via SQL 2 senseis fictícios com status = 'ativo' e piloto = true em UFs diferentes, com links de afiliado de teste preenchidos (https://example.com/mensal e https://example.com/avulso), para o fluxo ser testável de ponta a ponta imediatamente.

CRITÉRIO DE PRONTO DO APP

(a) Jornada do atleta: estado → sensei → cadastro → produto → lead gravado → redirect para o link de teste; webhook simulado com o email do lead converte o lead; o mesmo webhook repetido cai como duplicado; email desconhecido vira órfão visível na Conciliação. (b) Jornada do sensei: aplicação em /sensei → aparece como 'aplicou' no admin → aprovado → ativação bloqueada sem links → links colados → ativado → visível na triagem pública.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://karate-sparring.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a304b19a-a827-42c6-a2cc-383f28c5d7dd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
