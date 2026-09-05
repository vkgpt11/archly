alter table projects add column owner_user_id uuid;
alter table projects add constraint fk_projects_owner_user foreign key(owner_user_id) references archly_users(id);
create index idx_projects_owner_user_updated on projects(owner_user_id, updated_at desc);
