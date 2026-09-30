-- Apply after progression_v3.sql. Testnet reservations only; never executes a payment.
begin;
create table if not exists public.blu_testnet_withdrawals (
 id uuid primary key,
 telegram_id bigint not null references public.blu_players(telegram_id),
 destination text not null check(destination ~ '^0:[a-f0-9]{64}$'),
 amount integer not null check(amount between 1 and 10),
 status text not null default 'pending' check(status in ('pending','processing','confirmed','refunded')),
 tx_hash text unique,
 created_at timestamptz not null default now(),
 check (status <> 'confirmed' or tx_hash is not null)
);
create index if not exists blu_testnet_withdrawals_user_date on public.blu_testnet_withdrawals(telegram_id,created_at);
alter table public.blu_testnet_withdrawals enable row level security;
revoke all on public.blu_testnet_withdrawals from public,anon,authenticated;
grant select,insert,update on public.blu_testnet_withdrawals to service_role;
create or replace function public.blu_request_testnet_withdrawal(p_user bigint,p_id uuid,p_amount integer,p_destination text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare player public.blu_players%rowtype; existing public.blu_testnet_withdrawals%rowtype; balance integer; total integer;
begin
 if p_user <= 0 or p_amount is null or p_amount not between 1 and 10 or p_destination is null or p_destination !~ '^0:[a-f0-9]{64}$' or p_id is null then raise exception 'INVALID_REQUEST';end if;
 select * into player from public.blu_players where telegram_id=p_user for update;
 if not found then raise exception 'PLAYER_NOT_READY';end if;
 select * into existing from public.blu_testnet_withdrawals where id=p_id;
 if found then
  if existing.telegram_id<>p_user or existing.amount<>p_amount or existing.destination<>p_destination then raise exception 'INVALID_REQUEST';end if;
  return jsonb_build_object('id',existing.id,'status',existing.status);
 end if;
 balance:=coalesce((player.city_save->>'blu')::integer,0);
 if balance<p_amount then raise exception 'INSUFFICIENT_BLU';end if;
 select coalesce(sum(amount),0) into total from public.blu_testnet_withdrawals where telegram_id=p_user and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if total+p_amount>10 then raise exception 'DAILY_LIMIT';end if;
 update public.blu_players set city_save=jsonb_set(city_save,'{blu}',to_jsonb(balance-p_amount)),city_revision=city_revision+1 where telegram_id=p_user;
 insert into public.blu_testnet_withdrawals(id,telegram_id,destination,amount) values(p_id,p_user,p_destination,p_amount);
 return jsonb_build_object('id',p_id,'status','pending');
end $$;
revoke all on function public.blu_request_testnet_withdrawal(bigint,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.blu_request_testnet_withdrawal(bigint,uuid,integer,text) to service_role;
commit;
