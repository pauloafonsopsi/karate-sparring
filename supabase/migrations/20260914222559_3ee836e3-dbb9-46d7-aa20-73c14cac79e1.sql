DROP POLICY IF EXISTS "cadastro publico de atleta" ON public.leads_atletas;
DROP POLICY IF EXISTS "aplicacao publica de sensei" ON public.senseis;
REVOKE INSERT ON public.leads_atletas FROM anon;
REVOKE INSERT ON public.senseis FROM anon;