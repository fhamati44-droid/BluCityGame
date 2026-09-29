-- Additive migration. Existing profile/RLS/action RPC are preserved.
begin;
alter table public.blu_players add column if not exists city_save jsonb;
alter table public.blu_players add column if not exists city_revision integer not null default 0;
create table if not exists public.blu_browser_links(ticket_hash text primary key,telegram_id bigint not null references public.blu_players(telegram_id),expires_at timestamptz not null);
alter table public.blu_browser_links enable row level security;
revoke all on public.blu_browser_links from anon,authenticated;
create or replace function public.blu_consume_link(p_hash text) returns bigint language plpgsql security definer set search_path=public as $$
declare player_id bigint;
begin delete from public.blu_browser_links where ticket_hash=p_hash and expires_at>now() returning telegram_id into player_id;return player_id;end;$$;
revoke all on function public.blu_consume_link(text) from public,anon,authenticated;
grant execute on function public.blu_consume_link(text) to service_role;
commit;

begin;
create table if not exists public.blu_coin_orders(id uuid primary key,telegram_id bigint not null references public.blu_players(telegram_id),coins integer not null check(coins>0),stars integer not null check(stars>0),status text not null default 'pending' check(status in ('pending','paid','refunded')),payment_charge text unique,created_at timestamptz not null default now());
alter table public.blu_coin_orders enable row level security;
revoke all on public.blu_coin_orders from anon,authenticated;
create or replace function public.blu_credit_coin_order(p_id uuid,p_user bigint,p_currency text,p_amount integer,p_charge text) returns void language plpgsql security definer set search_path=public as $$
declare o public.blu_coin_orders%rowtype;s jsonb;
begin
 select * into o from public.blu_coin_orders where id=p_id for update;
 if not found or o.telegram_id<>p_user or p_currency<>'XTR' or o.stars<>p_amount or p_charge is null or length(p_charge)=0 then raise exception 'invalid payment';end if;
 if o.status='paid' and o.payment_charge=p_charge then return;end if;
 if o.status<>'pending' then raise exception 'order already settled';end if;
 select coalesce(city_save,jsonb_build_object('coins',0)) into s from public.blu_players where telegram_id=p_user for update;
 update public.blu_players set city_save=jsonb_set(s,'{coins}',to_jsonb(coalesce((s->>'coins')::integer,0)+o.coins)),city_revision=city_revision+1 where telegram_id=p_user;
 update public.blu_coin_orders set status='paid',payment_charge=p_charge where id=p_id;
end;$$;
revoke all on function public.blu_credit_coin_order(uuid,bigint,text,integer,text) from public,anon,authenticated;
grant execute on function public.blu_credit_coin_order(uuid,bigint,text,integer,text) to service_role;
commit;

begin;
create table if not exists public.blu_command_receipts(command_id uuid primary key,telegram_id bigint not null references public.blu_players(telegram_id),created_at timestamptz not null default now());
alter table public.blu_command_receipts enable row level security;
revoke all on public.blu_command_receipts from anon,authenticated;
create or replace function public.blu_store_command(p_user bigint,p_revision integer,p_command uuid,p_save jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.blu_players%rowtype;receipt_user bigint;
begin
 select * into p from public.blu_players where telegram_id=p_user for update;
 if not found then raise exception 'unknown player';end if;
 select telegram_id into receipt_user from public.blu_command_receipts where command_id=p_command;
 if found then
   if receipt_user<>p_user then raise exception 'invalid command';end if;
   return jsonb_build_object('progress',p.city_save,'revision',p.city_revision);
 end if;
 if p.city_revision<>p_revision then return jsonb_build_object('code','CONFLICT','progress',p.city_save,'revision',p.city_revision);end if;
 if p_save is null or jsonb_typeof(p_save)<>'object' then raise exception 'invalid save';end if;
 insert into public.blu_command_receipts(command_id,telegram_id) values(p_command,p_user);
 update public.blu_players set city_save=p_save,city_revision=city_revision+1 where telegram_id=p_user;
 return jsonb_build_object('progress',p_save,'revision',p_revision+1);
end;$$;
revoke all on function public.blu_store_command(bigint,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.blu_store_command(bigint,integer,uuid,jsonb) to service_role;
commit;
