DROP VIEW IF EXISTS public.clubes_publicos;
DROP VIEW IF EXISTS public.unidades_publicas;

REVOKE ALL ON FUNCTION public.criar_sede_do_clube() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.slugificar(text) FROM public, anon, authenticated;