# Pagamentos dos atletas via Asaas (com split) + Greenn só para adesão do sensei

## O que muda para o atleta

No passo 4 da triagem, em vez de sair do app para um link de afiliado, o atleta escolhe:

- MENSAL R$ 100/mês — assinatura recorrente (Pix ou cartão de crédito)
- AVULSO R$ 30 — cobrança única (Pix ou cartão de crédito)

O app cria a cobrança no Asaas com split automático: R$ 80 do mensal e R$ 20 do avulso vão direto para a conta do sensei; o resto fica na conta principal. O atleta é levado para a página de pagamento do Asaas. Quando o pagamento é confirmado, o lead vira "convertido" e ele cai em /confirmado.

## O que muda para o sensei

- No painel do admin, cada sensei ganha um bloco "Conta de recebimento (Asaas)". O admin envia os dados do sensei (nome, CPF/CNPJ, e-mail, telefone, data de nascimento/abertura, endereço com CEP) e o app cria a subconta Asaas dele automaticamente e guarda o identificador da carteira.
- O sensei só pode ser "Ativado" quando a conta de recebimento existir (substitui a exigência atual dos dois links de afiliado).
- A adesão do sensei continua pela Greenn: o link de pagamento da adesão fica na aba Config e é mostrado ao sensei aprovado.

## Ambiente

Começamos no sandbox do Asaas: cobranças de teste, nenhum dinheiro real. Trocar para produção é só substituir a chave e ligar uma opção na Config.

## Webhooks

- Asaas: recebe confirmação de pagamento, assinatura paga, pagamento vencido/estornado. Atualiza o pagamento e o lead, registra tudo e trata repetições (mesmo evento chegando duas vezes não duplica).
- Greenn: continua funcionando como hoje, agora usada apenas para a adesão do sensei — ao confirmar o pagamento, marca a adesão do sensei como paga.

Depois de publicar, você cola as duas URLs nos painéis do Asaas e da Greenn; eu te mando as URLs prontas.

## Precisarei de você

- Chave de API do Asaas (sandbox) — pedirei em um formulário seguro
- Um token que você mesmo inventa para proteger o webhook do Asaas (cola igual nos dois lados)
- Confirmar o valor da adesão/token da Greenn, se mudar algo

## Detalhes técnicos

Banco (migração):
- `senseis`: + `asaas_wallet_id`, `asaas_account_id`, `asaas_status`, `adesao_paga boolean default false`. Os campos `link_afiliado_*` permanecem (histórico) mas saem do fluxo de checkout.
- Nova tabela `pagamentos`: `id`, `lead_id`, `sensei_id`, `produto` (mensal/avulso), `provedor` ('asaas'), `asaas_customer_id`, `asaas_payment_id` (unique), `asaas_subscription_id`, `valor_total`, `valor_sensei`, `billing_type` (PIX/CREDIT_CARD), `status` (pendente/confirmado/vencido/estornado), `invoice_url`, `payload jsonb`, timestamps. RLS: sem acesso anon; admin total; sensei lê só os próprios (`current_sensei_id()`); `service_role` total. GRANTs explícitos.
- `webhook_log`: + `provedor text default 'greenn'`; idempotência por `(provedor, evento_id)`.
- `config`: novas chaves `asaas_ambiente` ('sandbox'), `preco_mensal`, `preco_avulso`, `repasse_mensal`, `repasse_avulso`.

Server functions (`src/lib/asaas.functions.ts`, chamadas com `supabaseAdmin`, chave lida dentro do handler):
- `iniciarPagamento({ lead_id, produto, billingType })` — cria/reusa customer Asaas a partir do lead, cria `subscription` (mensal, cycle MONTHLY) ou `payment` (avulso) com `split: [{ walletId, fixedValue }]`, grava em `pagamentos`, retorna `invoiceUrl` para redirecionar.
- `criarSubcontaSensei({ sensei_id, ...dados })` — só admin (`has_role`), `POST /v3/accounts`, salva `asaas_account_id` + `asaas_wallet_id`.
- `redirectCheckout` fica apenas como fallback legado (não usado no fluxo novo).

Rotas de webhook:
- `src/routes/api/public/webhooks/asaas.ts` — valida header `asaas-access-token` contra `ASAAS_WEBHOOK_TOKEN`, processa `PAYMENT_CONFIRMED/RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`; atualiza `pagamentos` por `asaas_payment_id` e o lead para `convertido` (`convertido_em`); sem match → `pagamentos_orfaos`; sempre 200, erro interno gravado com `processado=false`.
- `src/routes/api/public/webhooks/greenn.ts` — mantém a lógica atual, passa a marcar `senseis.adesao_paga=true` quando o pagador casar com um sensei por e-mail; grava `provedor='greenn'`.

Frontend:
- `src/routes/index.tsx`: passo 4 com escolha de produto + forma de pagamento (Pix/cartão), chamada a `iniciarPagamento`, redirect para `invoiceUrl`; mensagem clara quando o sensei ainda não tem conta de recebimento.
- `src/routes/_authenticated/admin.tsx`: bloco de subconta Asaas no painel lateral, gate de "Ativar" por conta criada, coluna de pagamentos por sensei; aba Config com preços, repasses e ambiente.
- `src/routes/_authenticated/admin_.dojos.tsx`: mostra status de pagamento por lead.

Secrets: `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (+ `GREENN_WEBHOOK_TOKEN` que já existe).

Verificação: build + typecheck, e teste ponta a ponta em 390px no sandbox (lead → cobrança criada → webhook simulado converte → repetido cai como duplicado).
