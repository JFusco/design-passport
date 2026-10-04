-- Private single-operator store. The migration identity owns all objects.
-- Match Supabase's opt-in exposure setting before creating application objects.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role, public;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
create role design_passport_app nologin nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
create schema design_passport;
revoke all on schema design_passport from public, anon, authenticated;
alter default privileges in schema design_passport revoke all on tables from public, anon, authenticated;
alter default privileges in schema design_passport revoke all on sequences from public, anon, authenticated;
alter default privileges in schema design_passport revoke execute on functions from public, anon, authenticated;

create table design_passport.projects (
  scope text primary key check (length(btrim(scope)) between 1 and 200),
  display_name text check (length(btrim(display_name)) between 1 and 200),
  received_at timestamptz not null default now()
);
create table design_passport.audits (
  id uuid primary key,
  project_scope text not null references design_passport.projects(scope),
  report_sha256 text not null check (report_sha256 ~ '^[a-f0-9]{64}$'),
  report_identity_digest text not null check (report_identity_digest ~ '^h53:[a-f0-9]{14}$'),
  source_at timestamptz not null,
  received_at timestamptz not null default now(),
  grade text not null check (grade in ('A','B','C','D','F')),
  ready boolean not null,
  search_text text not null,
  search_vector tsvector generated always as (to_tsvector('simple', search_text)) stored,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  unique(project_scope, report_sha256), unique(project_scope, id)
);
create table design_passport.audit_exports (
  id uuid primary key,
  project_scope text not null,
  audit_id uuid not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  unique(project_scope, payload_sha256),
  foreign key(project_scope, audit_id) references design_passport.audits(project_scope, id)
);
create table design_passport.findings (
  project_scope text not null,
  audit_id uuid not null,
  finding_id text not null check (length(finding_id) > 0),
  rule_id text not null check (length(rule_id) > 0),
  status text not null check (status in ('pass','fail','needs-review','waived','not-applicable')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key(project_scope, audit_id, finding_id),
  foreign key(project_scope, audit_id) references design_passport.audits(project_scope, id)
);
create table design_passport.contributions (
  id text primary key check (id ~ '^h53:[a-f0-9]{14}$'),
  project_scope text not null references design_passport.projects(scope),
  report_identity_digest text not null check (report_identity_digest ~ '^h53:[a-f0-9]{14}$'),
  source_at timestamptz not null,
  received_at timestamptz not null default now(),
  search_text text not null,
  search_vector tsvector generated always as (to_tsvector('simple', search_text)) stored,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  unique(project_scope, id)
);
create table design_passport.observations (
  project_scope text not null,
  contribution_id text not null,
  occurrence integer not null check (occurrence >= 0),
  observation_key text not null check (length(observation_key) > 0),
  rule_id text,
  direction text not null check (direction in ('support','contradict')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key(project_scope, contribution_id, occurrence),
  foreign key(project_scope, contribution_id) references design_passport.contributions(project_scope, id)
);
create table design_passport.candidates (
  id text primary key check (length(id) > 0),
  project_scope text not null references design_passport.projects(scope),
  observation_key text not null check (length(observation_key) > 0),
  digest text not null check (digest ~ '^h53:[a-f0-9]{14}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  unique(project_scope, id)
);
create table design_passport.candidate_revisions (
  project_scope text not null,
  candidate_id text not null,
  digest text not null check (digest ~ '^h53:[a-f0-9]{14}$'),
  source_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  primary key(project_scope, candidate_id, digest),
  foreign key(project_scope, candidate_id) references design_passport.candidates(project_scope, id)
);
create table design_passport.decisions (
  id text primary key,
  request_id uuid not null unique,
  project_scope text not null,
  candidate_id text not null,
  candidate_digest text not null,
  action text not null check (action in ('approve','reject','defer')),
  scope text not null check (scope in ('project','shared')),
  rationale text not null check (length(btrim(rationale)) > 0),
  source_at timestamptz not null,
  received_at timestamptz not null default now(),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  foreign key(project_scope, candidate_id, candidate_digest)
    references design_passport.candidate_revisions(project_scope, candidate_id, digest)
);
create table design_passport.guidance_packs (
  id text primary key,
  project_scope text references design_passport.projects(scope),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  check ((id = 'shared' and project_scope is null) or (project_scope is not null and id = 'project:' || project_scope))
);

create index audits_date on design_passport.audits(source_at desc, id desc);
create index audits_project_date on design_passport.audits(project_scope, source_at desc, id desc);
create index audits_identity on design_passport.audits(project_scope, report_identity_digest);
create index audits_grade on design_passport.audits(grade, ready, source_at desc, id desc);
create index audits_search on design_passport.audits using gin(search_vector);
create index exports_audit on design_passport.audit_exports(project_scope, audit_id);
create index findings_rule_status on design_passport.findings(rule_id, status, project_scope, audit_id);
create index contributions_date on design_passport.contributions(source_at desc, id desc);
create index contributions_project_date on design_passport.contributions(project_scope, source_at desc, id desc);
create index contributions_identity on design_passport.contributions(project_scope, report_identity_digest);
create index contributions_search on design_passport.contributions using gin(search_vector);
create index observations_rule on design_passport.observations(rule_id, project_scope, contribution_id);
create index observations_key on design_passport.observations(project_scope, observation_key);
create index candidates_observation on design_passport.candidates(project_scope, observation_key);
create index contributions_identity_unscoped on design_passport.contributions(report_identity_digest, project_scope);
create index decisions_candidate on design_passport.decisions(project_scope, candidate_id, candidate_digest);
create index packs_project on design_passport.guidance_packs(project_scope);

-- JSONB preserves source objects; these fences prevent relational/payload drift.
alter table design_passport.audits add constraint audit_payload_identity check (
  (payload->'grade'->>'letter' = grade and (payload->>'ready')::boolean = ready) is true);
alter table design_passport.contributions add constraint contribution_payload_identity check (
  (payload->>'projectScope' = project_scope and payload->>'digest' = id
    and payload->>'reportDigest' = report_identity_digest) is true);
alter table design_passport.findings add constraint finding_payload_identity check (
  (payload->>'id' = finding_id and payload->>'ruleId' = rule_id and payload->>'status' = status) is true);
alter table design_passport.candidates add constraint candidate_payload_identity check (
  (payload->>'projectScope' = project_scope and payload->>'candidateId' = id
    and payload->>'digest' = digest and payload->>'observationKey' = observation_key) is true);
alter table design_passport.candidate_revisions add constraint revision_payload_identity check (
  (payload->>'projectScope' = project_scope and payload->>'candidateId' = candidate_id
    and payload->>'digest' = digest) is true);
alter table design_passport.decisions add constraint decision_payload_identity check (
  (id = 'decision:' || request_id::text and payload->>'decisionId' = id
    and payload->>'candidateId' = candidate_id and payload->>'candidateDigest' = candidate_digest
    and payload->>'action' = action and payload->>'scope' = scope and payload->>'rationale' = rationale) is true);

revoke all on all tables in schema design_passport from public, anon, authenticated;
revoke all on all sequences in schema design_passport from public, anon, authenticated;
grant usage on schema design_passport to design_passport_app;
grant select, insert on all tables in schema design_passport to design_passport_app;
grant update(display_name) on design_passport.projects to design_passport_app;
grant update(digest, payload) on design_passport.candidates to design_passport_app;
grant update(payload) on design_passport.guidance_packs to design_passport_app;

do $$ declare t text; begin
  foreach t in array array['projects','audits','audit_exports','findings','contributions','observations','candidates','candidate_revisions','decisions','guidance_packs'] loop
    execute format('alter table design_passport.%I enable row level security', t);
    execute format('create policy app_read on design_passport.%I for select to design_passport_app using (true)', t);
    execute format('create policy app_insert on design_passport.%I for insert to design_passport_app with check (true)', t);
  end loop;
  foreach t in array array['projects','candidates','guidance_packs'] loop
    execute format('create policy app_update on design_passport.%I for update to design_passport_app using (true) with check (true)', t);
  end loop;
end $$;
