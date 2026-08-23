create table projects (
    id uuid primary key,
    owner_email varchar(255) not null,
    name varchar(120) not null,
    canvas_json text not null,
    markdown text not null,
    revision bigint not null default 0,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index idx_projects_owner_updated on projects(owner_email, updated_at desc);
