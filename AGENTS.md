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
