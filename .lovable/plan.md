# Termos, privacidade e regra final do ranking

## Objetivo
Fechar as duas pendências públicas sem alterar banco, autenticação ou fluxos fora do necessário.

## Implementação

1. **Termos de Participação**
   - Criar `/termos` com texto preliminar e data de versão.
   - Cobrir elegibilidade 18+, vínculo e autorização pelo clube, rotina semanal, conduta e segurança, registros de presença, ranking por temporada, cursos, Legends Camp sem convocação garantida e natureza preliminar sujeita à revisão jurídica.

2. **Política de Privacidade**
   - Criar `/privacidade` com texto preliminar e data de versão.
   - Explicar dados coletados, finalidade, dados visíveis ao clube, marketing opcional, compartilhamentos operacionais, localização pontual do futuro check-in, foto da turma no modo verificação, segurança, prazos de guarda e direitos previstos na LGPD.
   - Deixar claro que não há rastreamento contínuo nem uso automático da foto para publicidade.

3. **Links legais completos**
   - Transformar os textos de aceite do atleta, da pré-inscrição e do sensei em links reais para as páginas correspondentes.
   - Ligar o aceite das regras do ranking à página `/ranking`.
   - Adicionar Termos e Privacidade ao rodapé principal e ao rodapé da página de senseis.

4. **Ranking fiel à etapa 2**
   - Mostrar: Treinou, Assistiu, Constância, Falta e Curso concluído.
   - Explicar que “Assistiu” mantém a constância, falta a zera, o bônus ocorre a cada ciclo configurado, os pontos valem por temporada e o Camp encerra cada temporada.
   - Manter a zona de convocação configurável e a ressalva de curadoria.

5. **Autonomia na Config**
   - Acrescentar os parâmetros editáveis “pontos por Assistiu” e “semanas do ciclo de constância”.
   - Usar todos os números da Config na página, com os valores finais como fallback: 10, 5, 15, 4, 25 e Top 20.
   - Não criar migração nem alterar estrutura do banco; a tabela genérica de Config já suporta essas chaves.

6. **Regra permanente e validação**
   - Registrar em `AGENTS.md` que a etapa 2 deve calcular o ranking exclusivamente pelos mesmos parâmetros da Config e pelas regras aprovadas.
   - Verificar rotas, links, visual mobile/desktop e ausência de erros.

## Limite de escopo
Nenhuma mudança em banco, autenticação, cadastro, autorização, pagamentos ou demais funções do produto.
