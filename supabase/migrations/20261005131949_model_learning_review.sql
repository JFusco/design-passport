-- Forward-only model review store; no historical charges are inferred.
create table design_passport.model_guides (
  id uuid primary key, project_scope text not null references design_passport.projects(scope),
  payload jsonb not null, digest text not null, received_at timestamptz not null default now(),
  unique(project_scope, id), unique(project_scope, digest)
);
create table design_passport.model_settings (
  project_scope text primary key references design_passport.projects(scope),
  allowance numeric(20,12) not null default 0 check(allowance >= 0), enabled boolean not null default true,
  active_guide uuid, foreign key(project_scope, active_guide) references design_passport.model_guides(project_scope, id)
);
create table design_passport.model_runs (
  id uuid primary key, project_scope text not null references design_passport.projects(scope),
  request_material jsonb not null, request_digest text not null, frozen jsonb not null,
  reservation numeric(20,12) not null check(reservation > 0),
  registered_at timestamptz not null default now(), retry_of uuid,
  outcome text not null default 'queued' check(outcome in ('queued','running','completed','failed','cancelled','interrupted')),
  ended_at timestamptz, terminal jsonb, cancel_requested boolean not null default false,
  lease_owner uuid, lease_generation bigint not null default 0, lease_expires_at timestamptz,
  cleanup_done boolean not null default false,
  unique(project_scope, id), foreign key(project_scope, retry_of) references design_passport.model_runs(project_scope, id),
  check((outcome in ('queued','running') and ended_at is null and terminal is null) or
        (outcome in ('completed','failed','cancelled','interrupted') and ended_at is not null and terminal is not null))
);
create unique index model_one_active on design_passport.model_runs(project_scope) where outcome in ('queued','running');
create index model_claims on design_passport.model_runs(lease_expires_at, registered_at) where outcome in ('queued','running');
create index model_project_history on design_passport.model_runs(project_scope, registered_at desc, id);
create index model_retry_lookup on design_passport.model_runs(project_scope, retry_of) where retry_of is not null;
create table design_passport.model_attempts (
  id uuid primary key, project_scope text not null, run_id uuid not null unique,
  dispatched_at timestamptz not null, lease_generation bigint not null, input_tokens integer not null check(input_tokens between 0 and 64000),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id), unique(project_scope, run_id, id)
);
create table design_passport.model_events (
  id uuid primary key, project_scope text not null, run_id uuid not null,
  kind text not null, payload jsonb not null, recorded_at timestamptz not null default now(),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id)
);
create index model_events_run on design_passport.model_events(run_id, recorded_at, id);
create table design_passport.model_recommendations (
  id uuid primary key, project_scope text not null, run_id uuid not null,
  candidate_id text not null, candidate_digest text not null, payload jsonb not null,
  unique(project_scope, run_id, id), unique(run_id, candidate_id),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id),
  foreign key(project_scope, candidate_id, candidate_digest) references design_passport.candidate_revisions(project_scope, candidate_id, digest)
);
create index model_recommendations_candidate on design_passport.model_recommendations(project_scope, candidate_id, candidate_digest);
create table design_passport.model_applications (
  id uuid primary key, project_scope text not null, run_id uuid not null, request_material jsonb not null,
  result jsonb not null, context_digest text not null, ordinal integer not null check(ordinal > 0),
  recorded_at timestamptz not null default now(), unique(project_scope, run_id, id), unique(run_id, ordinal),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id)
);
alter table design_passport.decisions add constraint decisions_project_id unique(project_scope, id);
create table design_passport.model_application_decisions (
  project_scope text not null, run_id uuid not null, application_id uuid not null, recommendation_id uuid not null,
  decision_id text not null,
  primary key(recommendation_id),
  foreign key(project_scope, run_id, application_id) references design_passport.model_applications(project_scope, run_id, id),
  foreign key(project_scope, run_id, recommendation_id) references design_passport.model_recommendations(project_scope, run_id, id),
  foreign key(project_scope, decision_id) references design_passport.decisions(project_scope, id)
);
create index model_application_lookup on design_passport.model_application_decisions(run_id, application_id);
create index model_decision_lookup on design_passport.model_application_decisions(project_scope, decision_id);
create table design_passport.model_accounting (
  id uuid primary key, project_scope text not null, run_id uuid not null, version integer not null check(version > 0),
  status text not null check(status in ('reserved','unknown','estimated','billed','zero')),
  amount numeric(20,12), evidence jsonb not null, recorded_at timestamptz not null default now(),
  unique(run_id, version), unique(project_scope, run_id, id),
  check((status in ('reserved','unknown') and amount is null) or (status in ('estimated','billed','zero') and amount >= 0)),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id)
);
create table design_passport.model_reconciliations (
  id uuid primary key, project_scope text not null, run_id uuid not null, settlement_id uuid,
  request_material jsonb not null, result jsonb not null, kind text not null check(kind in ('billed','discrepancy_acknowledgement','retrieve')),
  recorded_at timestamptz not null default now(),
  foreign key(project_scope, run_id) references design_passport.model_runs(project_scope, id),
  foreign key(project_scope, run_id, settlement_id) references design_passport.model_accounting(project_scope, run_id, id)
);
create index model_reconciliation_lookup on design_passport.model_reconciliations(project_scope, run_id, settlement_id);

-- Column grants freeze all registration/request/price material. Terminal seal
-- allows only operational lease and provider cleanup controls to advance.
create function design_passport.guard_model_run() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.ended_at is not null and
    (to_jsonb(new) - array['lease_owner','lease_generation','lease_expires_at','cleanup_done']) is distinct from
    (to_jsonb(old) - array['lease_owner','lease_generation','lease_expires_at','cleanup_done']) then
    raise exception 'Model run is sealed' using errcode = '23514';
  end if;
  if new.lease_generation < old.lease_generation then raise exception 'Invalid fencing generation' using errcode = '23514'; end if;
  if old.outcome = 'running' and new.outcome = 'queued' then raise exception 'Invalid lifecycle transition' using errcode = '23514'; end if;
  if old.cancel_requested and not new.cancel_requested then raise exception 'Cancellation is final' using errcode = '23514'; end if;
  return new;
end $$;
revoke all on function design_passport.guard_model_run() from public, anon, authenticated, service_role;
create trigger model_run_seal before update on design_passport.model_runs for each row execute function design_passport.guard_model_run();

do $$ declare t text; begin
  foreach t in array array['model_settings','model_guides','model_runs','model_attempts','model_events','model_recommendations','model_applications','model_application_decisions','model_accounting','model_reconciliations'] loop
    execute format('revoke all on design_passport.%I from public, anon, authenticated, service_role', t);
    execute format('grant select, insert on design_passport.%I to design_passport_app', t);
    execute format('alter table design_passport.%I enable row level security', t);
    execute format('create policy app_read on design_passport.%I for select to design_passport_app using (true)', t);
    execute format('create policy app_insert on design_passport.%I for insert to design_passport_app with check (true)', t);
  end loop;
  foreach t in array array['model_settings','model_runs'] loop
    execute format('create policy app_update on design_passport.%I for update to design_passport_app using (true) with check (true)', t);
  end loop;
end $$;
grant update(allowance, enabled, active_guide) on design_passport.model_settings to design_passport_app;
grant update(outcome, ended_at, terminal, cancel_requested, lease_owner, lease_generation, lease_expires_at, cleanup_done) on design_passport.model_runs to design_passport_app;
