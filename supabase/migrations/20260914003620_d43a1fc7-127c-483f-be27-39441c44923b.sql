REVOKE SELECT ON public.senseis FROM anon;
REVOKE SELECT (id, nome, dojo, cidade, uf, graduacao, foto_url, status, piloto) ON public.senseis FROM anon;
DROP POLICY IF EXISTS "senseis ativos visiveis publicamente" ON public.senseis;

CREATE VIEW public.senseis_publicos
WITH (security_barrier = true)
AS
SELECT id, nome, dojo, cidade, uf, graduacao, foto_url, piloto
FROM public.senseis
WHERE status = 'ativo';

REVOKE ALL ON public.senseis_publicos FROM PUBLIC;
GRANT SELECT ON public.senseis_publicos TO anon, authenticated;
GRANT ALL ON public.senseis_publicos TO service_role;