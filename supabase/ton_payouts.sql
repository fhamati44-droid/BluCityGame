-- Apply after ton_testnet.sql. Use a dedicated V4 testnet treasury exclusively.
begin;
alter table public.blu_testnet_withdrawals add column if not exists signed_boc text;
alter table public.blu_testnet_withdrawals add column if not exists message_expires_at timestamptz;
alter table public.blu_testnet_withdrawals add column if not exists treasury text;
create or replace function public.blu_claim_testnet_payout() returns jsonb
language plpgsql security definer set search_path=public as $$
declare item public.blu_testnet_withdrawals%rowtype;
begin
 perform pg_advisory_xact_lock(72658321);
 select * into item from public.blu_testnet_withdrawals where status='processing' order by created_at,id limit 1;
 if not found then
  select * into item from public.blu_testnet_withdrawals where status='pending' order by created_at,id limit 1 for update;
  if not found then return null;end if;
  update public.blu_testnet_withdrawals set status='processing' where id=item.id returning * into item;
 end if;
 return to_jsonb(item);
end $$;
create or replace function public.blu_save_testnet_message(p_id uuid,p_boc text,p_expires timestamptz,p_treasury text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare item public.blu_testnet_withdrawals%rowtype;
begin
 select * into item from public.blu_testnet_withdrawals where id=p_id for update;
 if not found or item.status<>'processing' then raise exception 'INVALID_PAYOUT';end if;
 if item.signed_boc is null then
  if p_boc is null or length(p_boc)>20000 or p_expires<=now() or p_treasury !~ '^0:[a-f0-9]{64}$' then raise exception 'INVALID_MESSAGE';end if;
  update public.blu_testnet_withdrawals set signed_boc=p_boc,message_expires_at=p_expires,treasury=p_treasury where id=p_id returning * into item;
 elsif item.treasury<>p_treasury then raise exception 'TREASURY_CHANGED';end if;
 return to_jsonb(item);
end $$;
revoke all on function public.blu_claim_testnet_payout() from public,anon,authenticated;
revoke all on function public.blu_save_testnet_message(uuid,text,timestamptz,text) from public,anon,authenticated;
grant execute on function public.blu_claim_testnet_payout() to service_role;
grant execute on function public.blu_save_testnet_message(uuid,text,timestamptz,text) to service_role;
commit;
