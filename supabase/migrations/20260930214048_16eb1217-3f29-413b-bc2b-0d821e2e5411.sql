-- 1. papel atleta
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'atleta';

-- 2. colunas do dojo no cadastro de sensei
ALTER TABLE public.senseis
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS raio_metros integer NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS fuso_horario text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS dia_aula smallint,
  ADD COLUMN IF NOT EXISTS horario_aula time,
  ADD COLUMN IF NOT EXISTS duracao_minutos integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS selo_status text NOT NULL DEFAULT 'neutro',
  ADD COLUMN IF NOT EXISTS onboarding_concluido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pais text NOT NULL DEFAULT 'BR';

ALTER TABLE public.senseis
  ADD CONSTRAINT senseis_dia_aula_check CHECK (dia_aula IS NULL OR dia_aula BETWEEN 1 AND 7);

-- 3. perfis de atleta
CREATE TABLE IF NOT EXISTS public.atletas (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  data_nascimento date NOT NULL,
  pais text NOT NULL DEFAULT 'BR',
  aceite_termos boolean NOT NULL DEFAULT false,
  aceite_lgpd boolean NOT NULL DEFAULT false,
  aceite_ranking boolean NOT NULL DEFAULT false,
  aceites_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS atletas_email_uidx ON public.atletas (lower(email));

GRANT SELECT, INSERT, UPDATE ON public.atletas TO authenticated;
GRANT ALL ON public.atletas TO service_role;
ALTER TABLE public.atletas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atleta ve proprio perfil" ON public.atletas
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "atleta edita proprio perfil" ON public.atletas
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin gerencia atletas" ON public.atletas
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_atletas_updated_at BEFORE UPDATE ON public.atletas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. vinculo historico atleta <-> dojo
CREATE TABLE IF NOT EXISTS public.atleta_dojos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL REFERENCES public.atletas(id) ON DELETE CASCADE,
  sensei_id uuid NOT NULL REFERENCES public.senseis(id),
  desde date NOT NULL DEFAULT CURRENT_DATE,
  ate date,
  origem text NOT NULL DEFAULT 'cadastro',
  obs text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atleta_dojos_atleta_idx ON public.atleta_dojos (atleta_id);
CREATE INDEX IF NOT EXISTS atleta_dojos_sensei_idx ON public.atleta_dojos (sensei_id);
CREATE UNIQUE INDEX IF NOT EXISTS atleta_dojos_ativo_uidx
  ON public.atleta_dojos (atleta_id) WHERE ate IS NULL;

GRANT SELECT ON public.atleta_dojos TO authenticated;
GRANT ALL ON public.atleta_dojos TO service_role;
ALTER TABLE public.atleta_dojos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atleta ve proprio vinculo" ON public.atleta_dojos
  FOR SELECT TO authenticated USING (atleta_id = auth.uid());
CREATE POLICY "sensei ve vinculos do seu dojo" ON public.atleta_dojos
  FOR SELECT TO authenticated USING (sensei_id = private.current_sensei_id());
CREATE POLICY "admin gerencia vinculos de dojo" ON public.atleta_dojos
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- 5. filiacoes
CREATE TABLE IF NOT EXISTS public.filiacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('atleta','sensei')),
  atleta_id uuid REFERENCES public.atletas(id) ON DELETE CASCADE,
  sensei_id uuid REFERENCES public.senseis(id),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','cancelada')),
  provedor text NOT NULL DEFAULT 'manual' CHECK (provedor IN ('manual','pagarme')),
  assinatura_externa_id text,
  motivo text,
  obs text,
  decidido_por uuid REFERENCES auth.users(id),
  ativada_em timestamptz,
  alterada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT filiacoes_alvo_check CHECK (
    (tipo = 'atleta' AND atleta_id IS NOT NULL) OR (tipo = 'sensei' AND sensei_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS filiacoes_atleta_idx ON public.filiacoes (atleta_id);
CREATE INDEX IF NOT EXISTS filiacoes_sensei_idx ON public.filiacoes (sensei_id);

GRANT SELECT ON public.filiacoes TO authenticated;
GRANT ALL ON public.filiacoes TO service_role;
ALTER TABLE public.filiacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "atleta ve propria filiacao" ON public.filiacoes
  FOR SELECT TO authenticated USING (atleta_id = auth.uid());
CREATE POLICY "sensei ve filiacao do seu dojo" ON public.filiacoes
  FOR SELECT TO authenticated USING (sensei_id = private.current_sensei_id());
CREATE POLICY "admin gerencia filiacoes" ON public.filiacoes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_filiacoes_updated_at BEFORE UPDATE ON public.filiacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. auditoria do alfinete
CREATE TABLE IF NOT EXISTS public.dojo_alfinete_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensei_id uuid NOT NULL REFERENCES public.senseis(id) ON DELETE CASCADE,
  latitude_antiga double precision,
  longitude_antiga double precision,
  latitude_nova double precision,
  longitude_nova double precision,
  alterado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dojo_alfinete_sensei_idx ON public.dojo_alfinete_historico (sensei_id);

GRANT SELECT ON public.dojo_alfinete_historico TO authenticated;
GRANT ALL ON public.dojo_alfinete_historico TO service_role;
ALTER TABLE public.dojo_alfinete_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sensei ve historico do seu alfinete" ON public.dojo_alfinete_historico
  FOR SELECT TO authenticated USING (sensei_id = private.current_sensei_id());
CREATE POLICY "admin le historico de alfinete" ON public.dojo_alfinete_historico
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- 7. contatos existentes vinculados a conta criada depois
ALTER TABLE public.leads_atletas
  ADD COLUMN IF NOT EXISTS atleta_id uuid REFERENCES public.atletas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_atletas_atleta_idx ON public.leads_atletas (atleta_id);
CREATE INDEX IF NOT EXISTS leads_atletas_email_idx ON public.leads_atletas (lower(email));