create table archly_users (
    id uuid primary key,
    google_subject varchar(255) not null unique,
    email varchar(255) not null,
    first_login_at timestamp with time zone not null,
    last_login_at timestamp with time zone not null,
    login_count bigint not null default 0,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create unique index uq_archly_users_email on archly_users(email);

create table user_sessions (
    id uuid primary key,
    user_id uuid not null references archly_users(id) on delete cascade,
    session_hash varchar(64) not null,
    established_at timestamp with time zone not null,
    last_seen_at timestamp with time zone not null,
    expires_at timestamp with time zone not null,
    constraint uq_user_sessions_identity unique(user_id, session_hash)
);

create index idx_user_sessions_expiry on user_sessions(expires_at);

create table product_events (
    id uuid primary key,
    user_id uuid not null references archly_users(id) on delete cascade,
    project_id uuid,
    event_type varchar(40) not null,
    occurred_at timestamp with time zone not null,
    constraint chk_product_event_type check (event_type in (
        'SESSION_ESTABLISHED', 'PROJECT_CREATED', 'PROJECT_DUPLICATED',
        'PROJECT_CONTENT_SAVED', 'PROJECT_ARCHIVED', 'PROJECT_RESTORED',
        'PROJECT_DELETED'
    ))
);

create index idx_product_events_type_time on product_events(event_type, occurred_at desc);
create index idx_product_events_user_time on product_events(user_id, occurred_at desc);
create index idx_product_events_project_time on product_events(project_id, occurred_at desc);

create table admin_audit_events (
    id uuid primary key,
    administrator_user_id uuid not null references archly_users(id) on delete cascade,
    action varchar(80) not null,
    correlation_id varchar(100) not null,
    occurred_at timestamp with time zone not null
);

create index idx_admin_audit_time on admin_audit_events(occurred_at desc);
