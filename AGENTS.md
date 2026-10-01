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

- Pagamentos só na etapa 4, via Stone/Pagar.me (recebedor por clube + split de valor fixo da filiação da liga). Campos do banco usam nome neutro (`recebedor_status`).
- `pagamentos`, `pagamentos_orfaos` e `webhook_log` são histórico arquivado: leitura só pelo admin, sem escrita pelo app.
- Papéis em `user_roles` + `private.has_role` / `private.current_sensei_id`; checados no `beforeLoad` de `/admin`, `/clube` e `/atleta`, nunca em `useEffect`.
- Marca só em `src/components/brand.tsx`; endereço público só em `src/lib/config.ts` (`SITE_URL`, `SITE_HOST`, `siteUrl`, `OG_IMAGE`).
- Modelo clube → unidades: `senseis` é o clube; alfinete, raio, fuso e dados da aula ficam em `unidades` (sede por trigger), porque a presença da etapa 2 aponta para a unidade. Área do clube é `/clube`; `/admin/dojos` só redireciona.
- `senseis.link_publico_ativo` é coluna gerada (`status='ativo' AND (piloto OR recebedor_status='aprovada')`), nunca trigger.
- Edições por server function com lista fechada de campos: `atualizarMinhaUnidade`, `definirMinhaMensalidade` (sensei) e `atualizarMeuPerfil` (atleta: nome, whatsapp, faixa, marketing — sem policy de UPDATE em `atletas`). Raio, status, piloto, slug, recebedor e anuidade são do admin.
- SMTP sem domínio próprio limita 30 emails/hora: convite de sensei usa `generateLink` invite (email é botão separado) e cadastro de atleta usa `email_confirm: true` — reativar confirmação com domínio próprio. Email com conta existente só recebe vínculo de papel após confirmação do admin, nunca link de entrada.
- No piloto, autorizar atleta cria filiação `provedor='piloto_cortesia'`; fora do piloto a autorização só libera o pagamento.
- Parâmetros de negócio (valores, prazos, chaves, aviso global) ficam na tabela `config` e são editados na aba Config do `/admin`; o código lê do banco com fallback, nunca valores fixos.
- Roadmap: haverá ligas afiliadas acima dos clubes (ranking e seletiva próprios). Nunca assumir clube como topo da hierarquia nem ranking regional fixo por estado.
- Ranking da etapa 2 usa exclusivamente a Config: Treinou=`pontos_presenca`, Assistiu=`pontos_assistiu` e mantém constância, Falta zera constância, bônus=`pontos_sequencia` a cada `semanas_constancia`, curso=`pontos_curso`; pontos valem por temporada, e Top `vagas_camp` é zona de convocação sujeita à curadoria.
