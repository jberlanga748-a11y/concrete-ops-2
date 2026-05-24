-- Add covering indexes for every public foreign key that does not already
-- have one. This migration is intended to run before production data import.

begin;

do $$
declare
  fk record;
  index_name text;
begin
  for fk in
    select
      c.conname as constraint_name,
      n.nspname as schema_name,
      t.relname as table_name,
      array_agg(a.attname::text order by key.ordinality) as columns,
      string_agg(format('%I', a.attname), ', ' order by key.ordinality) as quoted_columns,
      c.conkey
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) with ordinality as key(attnum, ordinality) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
    where c.contype = 'f'
      and n.nspname = 'public'
      and not exists (
        select 1
        from pg_index i
        where i.indrelid = c.conrelid
          and i.indisvalid
          and i.indisready
          and (
            select array_agg(index_key.attnum::smallint order by index_key.ordinality)
            from unnest(i.indkey) with ordinality as index_key(attnum, ordinality)
            where index_key.ordinality <= array_length(c.conkey, 1)
          ) = c.conkey
      )
    group by c.conname, n.nspname, t.relname, c.conkey
  loop
    index_name := left(
      format('idx_%s_%s_fk', fk.table_name, array_to_string(fk.columns, '_')),
      52
    ) || '_' || substr(md5(fk.constraint_name), 1, 8);

    execute format(
      'create index if not exists %I on %I.%I (%s)',
      index_name,
      fk.schema_name,
      fk.table_name,
      fk.quoted_columns
    );
  end loop;
end;
$$;

commit;
