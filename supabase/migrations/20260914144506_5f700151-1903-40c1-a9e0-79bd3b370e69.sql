ALTER TABLE public.senseis
  ADD COLUMN IF NOT EXISTS asaas_account_id text,
  ADD COLUMN IF NOT EXISTS asaas_wallet_id text,
  ADD COLUMN IF NOT EXISTS asaas_status text,
  ADD COLUMN IF NOT EXISTS adesao_paga boolean NOT NULL DEFAULT false;

ALTER TABLE public.webhook_log
  ADD COLUMN IF NOT EXISTS provedor text NOT NULL DEFAULT 'greenn',
  ADD COLUMN IF NOT EXISTS evento_id text;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_log_provedor_evento_idx
  ON public.webhook_log (provedor, evento_id) WHERE evento_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads_atletas(id) ON DELETE SET NULL,
  sensei_id uuid REFERENCES public.senseis(id) ON DELETE SET NULL,
  produto text NOT NULL,
  provedor text NOT NULL DEFAULT 'asaas',
  asaas_customer_id text,
  asaas_payment_id text UNIQUE,
  asaas_subscription_id text,
  valor_total numeric(10,2) NOT NULL,
  valor_sensei numeric(10,2) NOT NULL,
  billing_type text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  invoice_url text,
  payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos TO authenticated;
GRANT ALL ON public.pagamentos TO service_role;

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia pagamentos" ON public.pagamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sensei ve pagamentos do seu dojo" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (sensei_id = public.current_sensei_id());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pagamentos_updated_at ON public.pagamentos;
CREATE TRIGGER update_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.config (chave, valor) VALUES
  ('asaas_ambiente', 'sandbox'),
  ('preco_mensal', '100'),
  ('preco_avulso', '30'),
  ('repasse_mensal', '80'),
  ('repasse_avulso', '20')
ON CONFLICT (chave) DO NOTHING;