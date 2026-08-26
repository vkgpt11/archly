alter table projects add column folder varchar(80);
alter table projects add column archived boolean not null default false;

create table project_shares (
    id uuid primary key,
    project_id uuid not null references projects(id) on delete cascade,
    token_hash varchar(64) not null unique,
    permission varchar(10) not null,
    revoked boolean not null default false,
    created_at timestamp with time zone not null,
    revoked_at timestamp with time zone
);

create index idx_project_shares_project on project_shares(project_id, created_at desc);
