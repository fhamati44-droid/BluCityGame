-- Run in Supabase SQL Editor. Preserves the deployed function and its grants.
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.blu_game_action(bigint,text,bigint,text)'::regprocedure);
  if definition ~* 'when\s+''open''\s+then' then return; end if;
  if position('case p_action' in definition) = 0 then
    raise exception 'Unexpected function definition. No changes applied.';
  end if;
  execute replace(definition, 'case p_action', 'case p_action when ''open'' then null;');
end $$;
