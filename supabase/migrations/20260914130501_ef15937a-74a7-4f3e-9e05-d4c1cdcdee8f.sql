create type public.app_role as enum ('admin','sensei');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "usuario ve seus papeis" on public.user_roles
for select to authenticated using (user_id = auth.uid());
create policy "admin gerencia papeis" on public.user_roles
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.sensei_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sensei_id uuid not null references public.senseis(id) on delete cascade,
  created_at timestamptz not null default now()
);
grant select on public.sensei_users to authenticated;
grant all on public.sensei_users to service_role;
alter table public.sensei_users enable row level security;

create policy "sensei ve seu vinculo" on public.sensei_users
for select to authenticated using (user_id = auth.uid());
create policy "admin gerencia vinculos" on public.sensei_users
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.current_sensei_id()
returns uuid language sql stable security definer set search_path = public as $$
  select sensei_id from public.sensei_users where user_id = auth.uid()
$$;

insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users where email = 'pafonso.pa@gmail.com'
on conflict do nothing;

drop policy if exists "admin gerencia senseis" on public.senseis;
create policy "admin gerencia senseis" on public.senseis
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "sensei ve proprio cadastro" on public.senseis
for select to authenticated using (id = public.current_sensei_id());

drop policy if exists "admin gerencia leads" on public.leads_atletas;
create policy "admin gerencia leads" on public.leads_atletas
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "sensei ve leads do seu dojo" on public.leads_atletas
for select to authenticated using (sensei_id = public.current_sensei_id());

drop policy if exists "admin gerencia orfaos" on public.pagamentos_orfaos;
create policy "admin gerencia orfaos" on public.pagamentos_orfaos
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "admin gerencia config" on public.config;
create policy "admin gerencia config" on public.config
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "admin gerencia webhook_log" on public.webhook_log;
create policy "admin gerencia webhook_log" on public.webhook_log
for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));