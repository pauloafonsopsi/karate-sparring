-- 1. Limpeza dos dados sintéticos de teste
DELETE FROM public.pagamentos
WHERE lead_id IN (SELECT id FROM public.leads_atletas WHERE email ILIKE '%@example.com')
   OR sensei_id IN (SELECT id FROM public.senseis WHERE email ILIKE '%@example.com');

UPDATE public.pagamentos_orfaos
SET lead_id = NULL
WHERE lead_id IN (SELECT id FROM public.leads_atletas WHERE email ILIKE '%@example.com');

DELETE FROM public.pagamentos_orfaos WHERE email_pagador ILIKE '%@example.com';

DELETE FROM public.webhook_log
WHERE payload::text ILIKE '%@example.com%';

DELETE FROM public.leads_atletas WHERE email ILIKE '%@example.com';

UPDATE public.leads_atletas
SET sensei_id = NULL
WHERE sensei_id IN (SELECT id FROM public.senseis WHERE email ILIKE '%@example.com');

DELETE FROM public.sensei_users
WHERE sensei_id IN (SELECT id FROM public.senseis WHERE email ILIKE '%@example.com');

DELETE FROM public.senseis WHERE email ILIKE '%@example.com';

-- 2. Configurações de cobrança que saem do app
DELETE FROM public.config
WHERE chave IN (
  'preco_mensal','repasse_mensal','preco_avulso','repasse_avulso',
  'adesao_total','adesao_parcela','adesao_parcela_pix','adesao_parcelas',
  'asaas_ambiente'
);

-- 3. Tabelas arquivadas: somente leitura pelo admin
DROP POLICY IF EXISTS "admin gerencia pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "sensei ve pagamentos do seu dojo" ON public.pagamentos;
DROP POLICY IF EXISTS "admin gerencia orfaos" ON public.pagamentos_orfaos;
DROP POLICY IF EXISTS "admin gerencia webhook_log" ON public.webhook_log;

REVOKE INSERT, UPDATE, DELETE ON public.pagamentos FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.pagamentos_orfaos FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.webhook_log FROM authenticated, anon;
GRANT SELECT ON public.pagamentos TO authenticated;
GRANT SELECT ON public.pagamentos_orfaos TO authenticated;
GRANT SELECT ON public.webhook_log TO authenticated;

CREATE POLICY "admin le historico de pagamentos" ON public.pagamentos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin le historico de orfaos" ON public.pagamentos_orfaos
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin le historico de webhooks" ON public.webhook_log
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
