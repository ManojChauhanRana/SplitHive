alter table public.group_invites
add constraint group_invites_group_id_email_key unique (group_id, email);
