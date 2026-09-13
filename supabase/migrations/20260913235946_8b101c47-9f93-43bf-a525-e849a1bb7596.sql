CREATE TABLE public.senseis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dojo text NOT NULL,
  cidade text NOT NULL,
  uf char(2) NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL UNIQUE,
  graduacao text,
  tempo_ensino text,
  instagram text,
  foto_url text,
  status text NOT NULL DEFAULT 'aplicou',
  piloto boolean NOT NULL DEFAULT false,
  link_afiliado_mensal text,
  link_afiliado_avulso text,
  data_adesao date,
  obs text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.leads_atletas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL,
  email text NOT NULL,
  cidade text,
  uf char(2) NOT NULL,
  sensei_id uuid REFERENCES public.senseis(id),
  produto_escolhido text,
  status text NOT NULL DEFAULT 'lead',
  aceite_lgpd boolean NOT NULL DEFAULT false,
  greenn_sale_id text,
  convertido_em timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id text UNIQUE,
  payload jsonb NOT NULL,
  processado boolean DEFAULT false,
  resultado text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.pagamentos_orfaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id text,
  email_pagador text,
  documento_pagador text,
  payload jsonb,
  conciliado boolean DEFAULT false,
  lead_id uuid REFERENCES public.leads_atletas(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.config (
  chave text PRIMARY KEY,
  valor text
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.senseis TO authenticated;
GRANT ALL ON public.senseis TO service_role;
GRANT SELECT (id, nome, dojo, cidade, uf, graduacao, foto_url, status, piloto) ON public.senseis TO anon;
GRANT INSERT (nome, dojo, cidade, uf, whatsapp, email, graduacao, tempo_ensino, instagram, status) ON public.senseis TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_atletas TO authenticated;
GRANT ALL ON public.leads_atletas TO service_role;
GRANT INSERT (nome, whatsapp, email, cidade, uf, sensei_id, produto_escolhido, aceite_lgpd) ON public.leads_atletas TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_log TO authenticated;
GRANT ALL ON public.webhook_log TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pagamentos_orfaos TO authenticated;
GRANT ALL ON public.pagamentos_orfaos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.config TO authenticated;
GRANT ALL ON public.config TO service_role;

-- RLS
ALTER TABLE public.senseis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_orfaos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "senseis ativos visiveis publicamente" ON public.senseis
  FOR SELECT TO anon USING (status = 'ativo');
CREATE POLICY "aplicacao publica de sensei" ON public.senseis
  FOR INSERT TO anon WITH CHECK (status = 'aplicou');
CREATE POLICY "admin gerencia senseis" ON public.senseis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cadastro publico de atleta" ON public.leads_atletas
  FOR INSERT TO anon WITH CHECK (aceite_lgpd = true);
CREATE POLICY "admin gerencia leads" ON public.leads_atletas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "admin gerencia webhook_log" ON public.webhook_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin gerencia orfaos" ON public.pagamentos_orfaos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin gerencia config" ON public.config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.config (chave, valor) VALUES
  ('link_adesao_sensei', ''),
  ('modo_piloto', 'true'),
  ('inscricoes_abertas', 'true');

INSERT INTO public.senseis (nome, dojo, cidade, uf, whatsapp, email, graduacao, tempo_ensino, status, piloto, link_afiliado_mensal, link_afiliado_avulso, data_adesao)
VALUES
  ('Sensei Ricardo Tanaka', 'Dojo Shizen', 'São Paulo', 'SP', '(11) 99999-0001', 'ricardo.tanaka@example.com', '5º Dan', '10 a 20', 'ativo', true, 'https://example.com/mensal', 'https://example.com/avulso', current_date),
  ('Sensei Marina Kubo', 'Dojo Kaze', 'Porto Alegre', 'RS', '(51) 99999-0002', 'marina.kubo@example.com', '4º Dan', '5 a 10', 'ativo', true, 'https://example.com/mensal', 'https://example.com/avulso', current_date);