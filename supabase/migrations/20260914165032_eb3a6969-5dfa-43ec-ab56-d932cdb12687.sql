ALTER TABLE public.senseis
  ADD COLUMN IF NOT EXISTS adesao_invoice_url text,
  ADD COLUMN IF NOT EXISTS adesao_asaas_id text;

INSERT INTO public.config (chave, valor) VALUES
  ('adesao_total', '1800'),
  ('adesao_parcela', '150'),
  ('adesao_parcelas', '12')
ON CONFLICT (chave) DO NOTHING;

DELETE FROM public.config WHERE chave = 'link_adesao_sensei';