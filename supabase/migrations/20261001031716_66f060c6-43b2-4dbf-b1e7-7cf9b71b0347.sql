ALTER TABLE public.filiacoes DROP CONSTRAINT IF EXISTS filiacoes_provedor_check;
ALTER TABLE public.filiacoes ADD CONSTRAINT filiacoes_provedor_check
  CHECK (provedor IN ('manual', 'piloto_cortesia', 'asaas', 'pagarme'));