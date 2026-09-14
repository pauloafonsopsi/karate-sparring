
-- ============ SENSEIS DE TESTE ============
insert into public.senseis (id, nome, dojo, cidade, uf, whatsapp, email, graduacao, tempo_ensino, status, piloto, adesao_paga, adesao_invoice_url, adesao_asaas_id, data_adesao, asaas_wallet_id, asaas_account_id, asaas_status, obs)
values
  ('11111111-1111-4111-8111-111111111101','Sensei Teste Akira Sato','Dojo Teste Hokuto','Campinas','SP','(19) 99911-1101','teste.akira@example.com','4º Dan','10 a 20','ativo',true,true,'https://www.asaas.com/i/teste-akira','pay_teste_akira', current_date - 20, 'wal_teste_akira','acc_teste_akira','criada','cadastro de teste'),
  ('11111111-1111-4111-8111-111111111102','Sensei Teste Yumi Nakano','Dojo Teste Sakura','Porto Alegre','RS','(51) 99911-1102','teste.yumi@example.com','3º Dan','5 a 10','ativo',true,false,'https://www.asaas.com/i/teste-yumi','pay_teste_yumi', null, 'wal_teste_yumi','acc_teste_yumi','criada','cadastro de teste'),
  ('11111111-1111-4111-8111-111111111103','Sensei Teste Bruno Lima','Dojo Teste Bahia','Salvador','BA','(71) 99911-1103','teste.bruno@example.com','2º Dan','menos de 5','aplicou',true,false,'https://www.asaas.com/i/teste-bruno-2','pay_teste_bruno_2', null, null, null, null,'cadastro de teste com adesao duplicada')
on conflict (id) do nothing;

-- ============ 10 ATLETAS DE EXEMPLO ============
insert into public.leads_atletas (id, nome, whatsapp, email, cidade, uf, sensei_id, produto_escolhido, status, aceite_lgpd, convertido_em)
values
  ('22222222-2222-4222-8222-222222222201','Atleta Teste 01 · Lucas Prado','(19) 98800-0001','atleta01@example.com','Campinas','SP','11111111-1111-4111-8111-111111111101','mensal','convertido',true, now() - interval '18 days'),
  ('22222222-2222-4222-8222-222222222202','Atleta Teste 02 · Marina Reis','(19) 98800-0002','atleta02@example.com','Campinas','SP','11111111-1111-4111-8111-111111111101','mensal','convertido',true, now() - interval '15 days'),
  ('22222222-2222-4222-8222-222222222203','Atleta Teste 03 · Diego Alves','(19) 98800-0003','atleta03@example.com','Valinhos','SP','11111111-1111-4111-8111-111111111101','avulso','convertido',true, now() - interval '9 days'),
  ('22222222-2222-4222-8222-222222222204','Atleta Teste 04 · Rafaela Cruz','(19) 98800-0004','atleta04@example.com','Campinas','SP','11111111-1111-4111-8111-111111111101','mensal','lead',true, null),
  ('22222222-2222-4222-8222-222222222205','Atleta Teste 05 · Henrique Sousa','(51) 98800-0005','atleta05@example.com','Porto Alegre','RS','11111111-1111-4111-8111-111111111102','mensal','convertido',true, now() - interval '7 days'),
  ('22222222-2222-4222-8222-222222222206','Atleta Teste 06 · Bianca Motta','(51) 98800-0006','atleta06@example.com','Canoas','RS','11111111-1111-4111-8111-111111111102','avulso','lead',true, null),
  ('22222222-2222-4222-8222-222222222207','Atleta Teste 07 · Tiago Nunes','(51) 98800-0007','atleta07@example.com','Porto Alegre','RS','11111111-1111-4111-8111-111111111102',null,'lead',true, null),
  ('22222222-2222-4222-8222-222222222208','Atleta Teste 08 · Camila Barros','(71) 98800-0008','atleta08@example.com','Salvador','BA','11111111-1111-4111-8111-111111111103','mensal','lead',true, null),
  ('22222222-2222-4222-8222-222222222209','Atleta Teste 09 · Pedro Vasques','(71) 98800-0009','atleta09@example.com','Lauro de Freitas','BA','11111111-1111-4111-8111-111111111103','avulso','orfao_conciliado',true, now() - interval '3 days'),
  ('22222222-2222-4222-8222-222222222210','Atleta Teste 10 · Sofia Andrade','(11) 98800-0010','atleta10@example.com','São Paulo','SP',null,null,'lead',true, null)
on conflict (id) do nothing;

-- ============ COBRANÇAS DE EXEMPLO ============
insert into public.pagamentos (lead_id, sensei_id, produto, provedor, asaas_customer_id, asaas_payment_id, asaas_subscription_id, valor_total, valor_sensei, billing_type, status, invoice_url)
values
  -- adesões dos senseis de teste
  (null,'11111111-1111-4111-8111-111111111101','adesao','asaas','cus_teste_akira','pay_teste_akira',null,1800,0,'CREDIT_CARD','confirmado','https://www.asaas.com/i/teste-akira'),
  (null,'11111111-1111-4111-8111-111111111102','adesao','asaas','cus_teste_yumi',null,'sub_teste_yumi',2400,0,'PIX','pendente','https://www.asaas.com/i/teste-yumi'),
  (null,'11111111-1111-4111-8111-111111111103','adesao','asaas','cus_teste_bruno','pay_teste_bruno_1',null,1800,0,'CREDIT_CARD','pendente','https://www.asaas.com/i/teste-bruno-1'),
  (null,'11111111-1111-4111-8111-111111111103','adesao','asaas','cus_teste_bruno','pay_teste_bruno_2',null,1800,0,'CREDIT_CARD','pendente','https://www.asaas.com/i/teste-bruno-2'),
  -- atletas
  ('22222222-2222-4222-8222-222222222201','11111111-1111-4111-8111-111111111101','mensal','asaas','cus_t01',null,'sub_t01',100,80,'PIX','confirmado','https://www.asaas.com/i/t01'),
  ('22222222-2222-4222-8222-222222222202','11111111-1111-4111-8111-111111111101','mensal','asaas','cus_t02',null,'sub_t02',100,80,'CREDIT_CARD','confirmado','https://www.asaas.com/i/t02'),
  ('22222222-2222-4222-8222-222222222203','11111111-1111-4111-8111-111111111101','avulso','asaas','cus_t03','pay_t03',null,30,20,'PIX','confirmado','https://www.asaas.com/i/t03'),
  ('22222222-2222-4222-8222-222222222204','11111111-1111-4111-8111-111111111101','mensal','asaas','cus_t04',null,'sub_t04',100,80,'PIX','pendente','https://www.asaas.com/i/t04'),
  ('22222222-2222-4222-8222-222222222205','11111111-1111-4111-8111-111111111102','mensal','asaas','cus_t05',null,'sub_t05',100,80,'CREDIT_CARD','confirmado','https://www.asaas.com/i/t05'),
  ('22222222-2222-4222-8222-222222222206','11111111-1111-4111-8111-111111111102','avulso','asaas','cus_t06','pay_t06',null,30,20,'PIX','vencido','https://www.asaas.com/i/t06'),
  ('22222222-2222-4222-8222-222222222208','11111111-1111-4111-8111-111111111103','mensal','asaas','cus_t08',null,'sub_t08',100,80,'PIX','pendente','https://www.asaas.com/i/t08'),
  ('22222222-2222-4222-8222-222222222209','11111111-1111-4111-8111-111111111103','avulso','asaas','cus_t09','pay_t09',null,30,20,'CREDIT_CARD','estornado','https://www.asaas.com/i/t09')
on conflict do nothing;

-- ============ PAGAMENTOS ÓRFÃOS (para conciliação) ============
insert into public.pagamentos_orfaos (sale_id, email_pagador, documento_pagador, conciliado, lead_id, payload)
values
  ('pay_orfao_teste_1','pagador.desconhecido1@example.com','52998224725',false,null,'{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_orfao_teste_1","value":100,"billingType":"PIX"}}'),
  ('pay_orfao_teste_2','pagador.desconhecido2@example.com','15350946056',false,null,'{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_orfao_teste_2","value":30,"billingType":"PIX"}}'),
  ('pay_t09','atleta09@example.com','11144477735',true,'22222222-2222-4222-8222-222222222209','{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_t09","value":30}}')
on conflict do nothing;

-- ============ AVISOS DE PAGAMENTO RECEBIDOS ============
insert into public.webhook_log (provedor, evento_id, sale_id, processado, resultado, payload)
values
  ('asaas','evt_teste_1','pay_t03',true,'pagamento confirmado','{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_t03"}}'),
  ('asaas','evt_teste_2','pay_orfao_teste_1',true,'sem pagamento correspondente: gravado como orfao','{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_orfao_teste_1"}}'),
  ('asaas','evt_teste_1','pay_t03',true,'duplicado ignorado','{"event":"PAYMENT_CONFIRMED","payment":{"id":"pay_t03"}}')
on conflict do nothing;
