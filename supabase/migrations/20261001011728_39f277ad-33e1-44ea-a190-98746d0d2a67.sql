-- ===== 1. Campos novos no clube =====
ALTER TABLE public.senseis
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS mensalidade_centavos integer,
  ADD COLUMN IF NOT EXISTS subconta_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS anuidade_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS anuidade_iniciada_em timestamptz;

ALTER TABLE public.senseis
  ADD CONSTRAINT senseis_subconta_status_chk
  CHECK (subconta_status IN ('pendente','em_analise','aprovada','recusada','dispensada_piloto'));

ALTER TABLE public.senseis
  ADD CONSTRAINT senseis_anuidade_status_chk
  CHECK (anuidade_status IN ('pendente','paga','isento_piloto','estornada'));

ALTER TABLE public.senseis
  ADD CONSTRAINT senseis_mensalidade_chk
  CHECK (mensalidade_centavos IS NULL OR mensalidade_centavos >= 3000);

-- slug: nome do dojô, com cidade quando houver repetição
CREATE OR REPLACE FUNCTION public.slugificar(txt text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(translate(txt,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
    '[^a-z0-9]+', '-', 'g'));
$$;

DO $$
DECLARE r record; base text; cand text; n int;
BEGIN
  FOR r IN SELECT id, dojo, cidade FROM public.senseis WHERE slug IS NULL LOOP
    base := public.slugificar(r.dojo);
    IF base = '' THEN base := 'clube'; END IF;
    cand := base;
    IF EXISTS (SELECT 1 FROM public.senseis WHERE slug = cand) THEN
      cand := base || '-' || public.slugificar(coalesce(r.cidade, ''));
    END IF;
    n := 2;
    WHILE EXISTS (SELECT 1 FROM public.senseis WHERE slug = cand) LOOP
      cand := base || '-' || n; n := n + 1;
    END LOOP;
    UPDATE public.senseis SET slug = cand WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.senseis ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS senseis_slug_key ON public.senseis (slug);

-- link público ativo: calculado, nunca mantido por trigger
ALTER TABLE public.senseis
  ADD COLUMN link_publico_ativo boolean
  GENERATED ALWAYS AS (
    status = 'ativo' AND (piloto OR subconta_status = 'aprovada')
  ) STORED;

-- piloto dispensa a subconta
UPDATE public.senseis SET subconta_status = 'dispensada_piloto', anuidade_status = 'isento_piloto'
WHERE piloto;

-- ===== 2. Unidades =====
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clube_id uuid NOT NULL REFERENCES public.senseis(id) ON DELETE CASCADE,
  nome text NOT NULL,
  is_sede boolean NOT NULL DEFAULT false,
  endereco text,
  latitude double precision,
  longitude double precision,
  raio_metros integer NOT NULL DEFAULT 250,
  fuso_horario text NOT NULL DEFAULT 'America/Sao_Paulo',
  dia_aula smallint CHECK (dia_aula IS NULL OR (dia_aula BETWEEN 1 AND 7)),
  horario_aula time,
  duracao_minutos integer NOT NULL DEFAULT 90,
  instrutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades TO authenticated;
GRANT ALL ON public.unidades TO service_role;

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin gerencia unidades" ON public.unidades
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "sensei ve unidades do seu clube" ON public.unidades
  FOR SELECT TO authenticated
  USING (clube_id = private.current_sensei_id());

CREATE TRIGGER update_unidades_updated_at
  BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS unidades_clube_idx ON public.unidades (clube_id);
CREATE UNIQUE INDEX IF NOT EXISTS unidades_sede_unica ON public.unidades (clube_id) WHERE is_sede;

-- ===== 3. Vínculo do atleta aponta para a unidade =====
ALTER TABLE public.atleta_dojos
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_autorizacao text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS solicitado_em timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS autorizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS autorizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recusa_motivo text;

ALTER TABLE public.atleta_dojos
  ADD CONSTRAINT atleta_dojos_status_autorizacao_chk
  CHECK (status_autorizacao IN ('pendente','autorizado','recusado'));

CREATE POLICY "atleta ve unidade do seu vinculo" ON public.unidades
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.atleta_dojos d
    WHERE d.unidade_id = unidades.id AND d.atleta_id = auth.uid()
  ));

-- ===== 4. Atleta: faixa e consentimento de marketing =====
ALTER TABLE public.atletas
  ADD COLUMN IF NOT EXISTS faixa text,
  ADD COLUMN IF NOT EXISTS aceite_marketing_eventos boolean NOT NULL DEFAULT false;

-- ===== 5. Sede automática para clubes existentes =====
INSERT INTO public.unidades (
  clube_id, nome, is_sede, endereco, latitude, longitude, raio_metros,
  fuso_horario, dia_aula, horario_aula, duracao_minutos, instrutor_id
)
SELECT s.id, 'Sede', true, s.endereco, s.latitude, s.longitude, s.raio_metros,
       s.fuso_horario, s.dia_aula, s.horario_aula, s.duracao_minutos,
       (SELECT su.user_id FROM public.sensei_users su WHERE su.sensei_id = s.id LIMIT 1)
FROM public.senseis s
WHERE NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.clube_id = s.id AND u.is_sede);

UPDATE public.atleta_dojos d
SET unidade_id = u.id,
    status_autorizacao = 'autorizado',
    autorizado_em = coalesce(d.autorizado_em, d.created_at)
FROM public.unidades u
WHERE u.clube_id = d.sensei_id AND u.is_sede AND d.unidade_id IS NULL;

-- Todo clube novo nasce com a sede
CREATE OR REPLACE FUNCTION public.criar_sede_do_clube()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.unidades (clube_id, nome, is_sede, endereco, latitude, longitude,
    raio_metros, fuso_horario, dia_aula, horario_aula, duracao_minutos)
  VALUES (NEW.id, 'Sede', true, NEW.endereco, NEW.latitude, NEW.longitude,
    NEW.raio_metros, NEW.fuso_horario, NEW.dia_aula, NEW.horario_aula, NEW.duracao_minutos);
  RETURN NEW;
END $$;

CREATE TRIGGER senseis_criar_sede
  AFTER INSERT ON public.senseis
  FOR EACH ROW EXECUTE FUNCTION public.criar_sede_do_clube();

-- ===== 6. Vitrine pública de clubes licenciados =====
CREATE VIEW public.clubes_publicos
WITH (security_invoker = off, security_barrier = true) AS
SELECT s.id, s.slug, s.dojo, s.nome AS responsavel, s.cidade, s.uf,
       s.graduacao, s.foto_url, s.piloto, s.mensalidade_centavos
FROM public.senseis s
WHERE s.link_publico_ativo;

GRANT SELECT ON public.clubes_publicos TO anon, authenticated;

CREATE VIEW public.unidades_publicas
WITH (security_invoker = off, security_barrier = true) AS
SELECT u.id, u.clube_id, u.nome, u.endereco, u.latitude, u.longitude,
       u.fuso_horario, u.dia_aula, u.horario_aula, u.duracao_minutos
FROM public.unidades u
JOIN public.senseis s ON s.id = u.clube_id
WHERE u.ativa AND s.link_publico_ativo;

GRANT SELECT ON public.unidades_publicas TO anon, authenticated;

-- ===== 7. Config de preços =====
INSERT INTO public.config (chave, valor) VALUES
  ('mensalidade_minima_centavos', '3000'),
  ('mensalidade_sugerida_centavos', '12000'),
  ('filiacao_liga_centavos', '1990')
ON CONFLICT (chave) DO NOTHING;