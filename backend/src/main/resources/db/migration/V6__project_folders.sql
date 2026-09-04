create table project_folders (
    id uuid primary key,
    owner_email varchar(255) not null,
    name varchar(80) not null,
    created_at timestamp with time zone not null,
    constraint uq_project_folders_owner_name unique (owner_email, name)
);

create index idx_project_folders_owner on project_folders(owner_email);
