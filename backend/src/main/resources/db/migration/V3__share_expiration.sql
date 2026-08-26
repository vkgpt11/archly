alter table project_shares add column expires_at timestamp with time zone;
-- Give existing unbounded links the same 30-day transition window as newly created links.
update project_shares set expires_at = current_timestamp + interval '30' day where expires_at is null;
alter table project_shares alter column expires_at set not null;
create index idx_project_shares_expiration on project_shares(expires_at);
