-- Run once in the Supabase SQL editor. Only the server's service role may call the action RPC.
create table if not exists public.blu_players (
  telegram_id bigint primary key,
  display_name text not null,
  sparks integer not null default 50 check (sparks >= 0),
  charge integer not null default 70 check (charge between 0 and 100),
  level integer not null default 1 check (level between 1 and 100),
  district integer not null default 1 check (district between 1 and 20),
  missions integer not null default 0,
  referrer bigint references public.blu_players(telegram_id),
  referral_paid boolean not null default false,
  last_charge timestamptz,
  last_mission timestamptz,
  created_at timestamptz not null default now()
);
alter table public.blu_players enable row level security;
-- No public policies. Clients do not get direct table access.
create or replace function public.blu_game_action(p_user_id bigint,p_name text,p_referrer bigint,p_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.blu_players%rowtype; now_at timestamptz := now(); cost integer; message text := 'ok';
begin
  if p_user_id <= 0 or p_name is null or length(p_name)>60 or p_action not in ('open','charge','mission','upgrade','district') then raise exception 'invalid action'; end if;
  insert into public.blu_players(telegram_id, display_name, referrer)
  values (p_user_id,p_name,case when p_referrer is distinct from p_user_id and exists(select 1 from public.blu_players where telegram_id=p_referrer) then p_referrer else null end)
  on conflict (telegram_id) do nothing;
  select * into p from public.blu_players where telegram_id=p_user_id for update;
  case p_action
    when 'open' then null;
    when 'charge' then
      if now_at < p.last_charge + interval '3 hours' then message := 'cooldown';
      else update public.blu_players set charge=least(100,charge+30),last_charge=now_at where telegram_id=p_user_id; end if;
    when 'mission' then
      if p.charge<10 then message := 'low_charge';
      elsif p.last_mission is not null and now_at < p.last_mission + interval '1 hour' then message := 'cooldown';
      else
        update public.blu_players set charge=charge-10,sparks=sparks+30+5*(level-1),missions=missions+1,last_mission=now_at where telegram_id=p_user_id;
        -- Referral reward unlocks only after the new player completes three missions.
        if p.missions=2 and p.referrer is not null and not p.referral_paid then
          update public.blu_players set sparks=sparks+50 where telegram_id=p.referrer;
          update public.blu_players set referral_paid=true where telegram_id=p_user_id;
        end if;
      end if;
    when 'upgrade' then
      cost := 80*p.level;
      if p.sparks<cost then message := 'low_sparks';
      elsif p.level>=100 then message := 'max_level';
      else update public.blu_players set sparks=sparks-cost,level=level+1 where telegram_id=p_user_id; end if;
    when 'district' then
      cost := 100*p.district;
      if p.sparks<cost then message := 'low_sparks';
      elsif p.district>=20 then message := 'max_district';
      else update public.blu_players set sparks=sparks-cost,district=district+1 where telegram_id=p_user_id; end if;
  end case;
  select * into p from public.blu_players where telegram_id=p_user_id;
  return jsonb_build_object('message',message,'player',jsonb_build_object('sparks',p.sparks,'charge',p.charge,'level',p.level,'district',p.district,'missions',p.missions,'lastCharge',p.last_charge,'lastMission',p.last_mission,'referrals',(select count(*) from public.blu_players where referrer=p_user_id)));
end $$;
revoke all on function public.blu_game_action(bigint,text,bigint,text) from public,anon,authenticated;
grant execute on function public.blu_game_action(bigint,text,bigint,text) to service_role;
