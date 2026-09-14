create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function private.current_sensei_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sensei_id from public.sensei_users where user_id = auth.uid()
$$;

revoke all on function private.has_role(uuid, public.app_role) from public;
revoke all on function private.current_sensei_id() from public;
grant execute on function private.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function private.current_sensei_id() to authenticated, service_role;

-- recreate policies against the private helpers
drop policy if exists "admin gerencia config" on public.config;
create policy "admin gerencia config" on public.config for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia leads" on public.leads_atletas;
create policy "admin gerencia leads" on public.leads_atletas for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "sensei ve leads do seu dojo" on public.leads_atletas;
create policy "sensei ve leads do seu dojo" on public.leads_atletas for select to authenticated
  using (sensei_id = private.current_sensei_id());

drop policy if exists "admin gerencia pagamentos" on public.pagamentos;
create policy "admin gerencia pagamentos" on public.pagamentos for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "sensei ve pagamentos do seu dojo" on public.pagamentos;
create policy "sensei ve pagamentos do seu dojo" on public.pagamentos for select to authenticated
  using (sensei_id = private.current_sensei_id());

drop policy if exists "admin gerencia orfaos" on public.pagamentos_orfaos;
create policy "admin gerencia orfaos" on public.pagamentos_orfaos for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia vinculos" on public.sensei_users;
create policy "admin gerencia vinculos" on public.sensei_users for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia senseis" on public.senseis;
create policy "admin gerencia senseis" on public.senseis for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "sensei ve proprio cadastro" on public.senseis;
create policy "sensei ve proprio cadastro" on public.senseis for select to authenticated
  using (id = private.current_sensei_id());

drop policy if exists "admin gerencia papeis" on public.user_roles;
create policy "admin gerencia papeis" on public.user_roles for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop policy if exists "admin gerencia webhook_log" on public.webhook_log;
create policy "admin gerencia webhook_log" on public.webhook_log for all to authenticated
  using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

drop function if exists public.has_role(uuid, public.app_role);
drop function if exists public.current_sensei_id();

revoke all on function public.update_updated_at_column() from public, anon, authenticated;