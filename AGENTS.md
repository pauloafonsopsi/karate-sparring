<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Decisões técnicas

- Pagamentos: nenhum provedor integrado na etapa 1A (Asaas removido). A partir da etapa 4, Pagar.me/Stone API v5 — evita reescrever o fluxo de filiação duas vezes.
- Tabelas `pagamentos`, `pagamentos_orfaos` e `webhook_log` são histórico arquivado: somente leitura pelo admin via RLS, sem escrita pelo app.
- Papéis de usuário ficam em `user_roles` + funções `private.has_role` / `private.current_sensei_id` — evita escalonamento de privilégio.
- Marca renderizada só em `src/components/brand.tsx` (texto), para trocar por imagem em um único lugar.

- Cadastro de atleta usa `email_confirm: true` (confirmação de email desligada) porque o SMTP padrão limita 30 emails/hora sem domínio próprio. Quando houver domínio próprio, reativar a confirmação de email no cadastro de atletas.
- Acesso de sensei é sempre por convite (`convidarSensei`); nunca definir ou redefinir senha de conta existente pelo painel — evita tomar a conta de um atleta por erro de digitação.
- Modelo clube → unidades: `senseis` é o clube licenciado; alfinete, raio, fuso e dados da aula ficam em `unidades` (sede criada por trigger), porque a presença da etapa 2 aponta para a unidade.
- Pagamentos a partir da etapa 4 são Asaas (subconta por clube + split fixo da filiação da liga); a referência a Pagar.me acima está superada.
- `senseis.link_publico_ativo` é coluna gerada (`status='ativo' AND (piloto OR subconta_status='aprovada')`) — nunca mantida por trigger, para não dessincronizar.
- Sensei edita só a unidade e a mensalidade por server function com lista fechada de campos (`atualizarMinhaUnidade`, `definirMinhaMensalidade`); raio, status, piloto, slug, subconta e anuidade são do admin.
- Área do clube é a rota `/clube`; `/admin/dojos` só redireciona.
- No piloto, autorizar atleta cria filiação `provedor='piloto_cortesia'`; fora do piloto a autorização só libera o pagamento.
